require('./db.js');
const express = require('express');
const app = express();
app.set('view engine','hbs');
const request = require("request");
// auth related
const bcrypt = require('bcryptjs');
const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const flash = require('connect-flash');
app.use(flash());
cachified_price = {}; // a global cache for price lookup
// // const async = require('async');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const Cuisine = mongoose.model('Cuisine');
const Ingredient = mongoose.model('Ingredient');
const Order = mongoose.model('Order');
const bodyParser = require('body-parser');
// initialize price cache
Cuisine.find({},(err,c_lst,count)=>{
    c_lst.forEach(e=>{
        cachified_price[e.cuisine_id] = e.price;
    })
});
app.use(bodyParser.urlencoded({extended: false}));
// // default path
const path = require("path");
const public_path = path.resolve(__dirname, "public");
app.use(express.static(public_path));
app.use(express.urlencoded({ extended: false }));
// // sessions
const session = require('express-session');
app.use(session({
    secret: 'add session secret here!',
    resave: true,
    saveUninitialized: true,
}));

// A HOF that takes in a cuisine object and returns a set property function that allows to
// modify its property with respect to its schema. The set property function takes in two parameters:
// 1. property to be modified, and 2. new value for the cuisine.
// Modifying the cuisine and cuisine id is not allowed.
function updateCuisine(cuisine){
    const c = cuisine;
    return function setProperty(property,new_value){
        if(c[property]===undefined || property==='cuisine' || property==='cuisine_id'){
            console.log('error setting the property',property,'to cuisine.');
        }
        else if (property==='ingredients'){
            c.ingredients = JSON.stringify(new_value)
        }
        else{
            c[property] = new_value;
        }
    }
}

// A HOF that takes in a user and returns a function that can push new orders into its stringified order history array.
// The function stores the resulting stringified array into the order history of the user.
function userOrderUpdate(user){
    const u = user;
    const arr = JSON.parse(user.order_history);
    return function(new_order){
        arr.push(new_order);
        u.order_history = JSON.stringify(arr);
    }
}

// Authentication using Passport Library, Research Reference:
// https://github.com/passport/express-4.x-local-example/blob/master/server.js
// https://github.com/saintedlama/passport-local-mongoose
// https://www.raymondcamden.com/2016/06/23/some-quick-tips-for-passport
passport.use('login', new Strategy({passReqToCallback: true}, (req, username, password, cb)=>{
        User.findOne({username: username}, (err, user, count) => {
            if (err) {
                cb(err);
            }
            else if (!user) {
                return cb(null, false, {message: 'User Not Found!'});
            }
            else {
                bcrypt.compare(password, user.password, (err, password_correct) => {
                    if (password_correct){
                        req.session.user = user;
                        return cb(null, user);
                    }
                    else
                        return cb(null, false, {message: 'Incorrect password!'});
                });
            }
        });
    }
));

passport.use('register', new Strategy({passReqToCallback: true}, (req, username, password, cb) => {
        if(password.length < 4){
            return cb(null,false,{message:'Your password have a minimum length of 4 characters!'});
        }
        User.findOne({username: username}, (err, user, count) => {
            if (err) {
                cb(err);
                console.log('error occurred during registering')
            }
            else if (user) {
                return cb(null, false, {message: 'Username already exist!'});
            }
            else {
                const saltRounds = 10;
                bcrypt.hash(password,saltRounds,(err,hash)=>{
                    new User({
                        username:username,
                        password:hash,
                        user_type:'consumer',
                        order_history: '[]',
                    }).save((err,user,count)=>{
                        if (err){
                            console.log('error storing user!');
                        }
                        else{
                            req.session.user = user;
                            return cb(null,user);
                        }
                    });
                });
            }
        });
    }
));

passport.serializeUser(function(user, cb) {
    cb(null, user._id);
});

passport.deserializeUser(function(id, cb) {
    User.findOne({_id: id}, (err, user, count) => {
        if (err) {
            return cb(err);
        }
        cb(null, user);
    });
});

app.use(passport.initialize());
app.use(passport.session());

app.use((req,res,next)=>{
    res.locals.user = req.session.user;
    // console.log(res.locals);
    // console.log(cachified_price);
    next();
});

app.get('/',(req,res)=>{
   res.redirect('/index');
});

app.get('/index',(req,res)=>{
    let display_admin_links = false;
    if(res.locals.user===undefined){
        display_admin_links = false;
    }
    else if(res.locals.user.user_type==='admin'){
        display_admin_links = true;
    }
    let register_error = false;
    let login_error = false;
    const flash_msg = req.flash('error').slice();
    if(flash_msg.length!==0){
        if(flash_msg[0] ==='Username already exist!'||flash_msg[0]==='Your password must have a minimum length of 4 characters!'){
            register_error = true;
        }
        else{
            login_error = true;
        }
    }
    Cuisine.find({},(err,cuisine_lst,count)=>{
        if(err){
            console.log(err);
        }
        else{
            res.render('index',{
                user:res.locals.user,
                display_admin_links:display_admin_links,
                msg:flash_msg,
                login_error:login_error,
                register_error:register_error,
                menu:cuisine_lst,
            });
        }
    });
   // res.render('index',{user:res.locals.user,display_admin_links:display_admin_links,msg:flash_msg,login_error:login_error,register_error:register_error});
});

app.get('/excited',(req,res)=>{
   res.send('<h1>nothing yet!</h1>');
});

app.post('/login', passport.authenticate('login', {
    successRedirect: '/index',
    failureRedirect: '/index',
    failureFlash: true
}));

app.post('/register', passport.authenticate('register', {
    successRedirect: '/index',
    failureRedirect: '/index',
    failureFlash: true
}));

app.get('/storage',(req,res)=>{
    if(res.locals.user===undefined){
        res.redirect('/index');
    }
    else if(res.locals.user.user_type!=='admin'){
        res.redirect('/index');
    }
    else{
        const display_admin_links = true;
        Ingredient.find({},(err,ings,count)=>{
            if(err){
                console.log('database error, cannot find ingredients');
                res.status(500);
            }
            else{
                const low_storage = ings.filter(ing=>ing.current_storage<10);
                res.render('storage',{ings:ings,low_storage:low_storage,display_admin_links:display_admin_links}); // an array of ingredient obj
            }
        });
    }
});

app.post('/storage',(req,res)=>{
     const ingredient_name = req.body.ingredient_name;
     const new_storage = parseInt(req.body.current_storage);
     Ingredient.findOne({ingredient_name:ingredient_name},(err,ing,count)=>{
         if(err){
             console.log('findOne Error in /storage.');
         }
         // ingredient not found, must be a type of new ingredient
         else if (!ing){
             new Ingredient({
                 ingredient_name : ingredient_name,
                 current_storage : new_storage,
             }).save((err,new_ing,count)=>{
                 if(err){
                     console.log('Ingredient Storing Error!');
                 }
                 else{
                     res.redirect('/storage');
                 }
             });
         }
         // ingredient has been found, update the storage amount
         else{
             ing.current_storage = new_storage;
             ing.save((err,u,c)=>{
                 if(err){
                     console.log('update existing document error');
                 }
                 else{
                     res.redirect('/storage');
                 }
             });
         }
     });
});

app.get('/update_menu',(req,res)=>{
    if(res.locals.user===undefined){
        res.redirect('/index');
    }
    else if(res.locals.user.user_type!=='admin'){
        res.redirect('/index');
    }
    else{
        Cuisine.find({},(err,cuisine_lst,count)=>{
            if(err){
                console.log(err);
            }
            else{
                res.render('update_menu',{
                    display_admin_links:true,
                    update_err:req.flash('update_err')[0],
                    update_suc:req.flash('update_suc')[0],
                    menu:cuisine_lst,
                });
            }
        })
    }
});

app.post('/update_menu',(req,res)=>{
    // not a valid input
    if (req.body.mode!=='remove' && req.body.mode!=='update'){
        req.flash('update_err','ERROR: Please specify the update mode.');
        res.redirect('/update_menu');
    }
    // remove
    else if(req.body.mode==='remove') {
        if (req.body.cuisine === '' && req.body.cuisine_id === '') {
            req.flash('update_err', 'ERROR: Please enter cuisine name or cuisine id.');
            res.redirect('/update_menu');
        }
        else if (req.body.cuisine === '') {
            Cuisine.find({cuisine_id: req.body.cuisine_id}, (err, cuisine, count) => {
                if (err) {
                    console.log(err);
                }
                else {
                    let counter = 0;
                    cuisine.forEach(elem => ++counter);
                    if (counter === 0) {
                        req.flash('update_err', 'ERROR: Cannot find the target cuisine.');
                        res.redirect('/update_menu');
                    }
                    else if (counter === 1) {
                        Cuisine.deleteOne({cuisine_id: req.body.cuisine_id}, (err) => {
                            if (err) {
                                req.flash('update_err', err);
                                res.redirect('/update_menu');
                            }
                            else {
                                delete cachified_price[req.body.cuisine_id];
                                req.flash('update_suc', 'Deletion success.');
                                res.redirect('/update_menu');
                            }
                        })
                    }
                }
            });
        }
        else {
            Cuisine.find({cuisine: req.body.cuisine}, (err, cuisine, count) => {
                if (err) {
                    console.log(err);
                }
                else {
                    let counter = 0;
                    cuisine.forEach(e => ++counter);
                    if (counter === 0) {
                        req.flash('update_err', 'ERROR: Cannot find the target cuisine');
                        res.redirect('/update_menu');
                    }
                    else if (counter === 1) {
                        Cuisine.deleteOne({cuisine: req.body.cuisine}, (err) => {
                            if (err) {
                                req.flash('update_err', 'ERROR: unable to convert to the data type as specified in schema');
                                res.redirect('/update_menu');
                            }
                            else {
                                delete cachified_price[req.body.cuisine];
                                req.flash('update_suc', 'Deletion success.');
                                res.redirect('/update_menu');
                            }
                        });
                    }
                }
            });
        }
    }
    // update
    else{
        Cuisine.find({
            cuisine:req.body.cuisine,
            cuisine_id:req.body.cuisine_id,
        },(err,cuisine,count)=>{
            let c = 0; // counter
            cuisine.forEach(e=>++c);
            // the target cuisine does not exist
            if(c===0){
                // create a new cuisine
                new Cuisine({
                    cuisine:req.body.cuisine,
                    cuisine_id:req.body.cuisine_id,
                    price:req.body.price,
                    ingredients:JSON.stringify(req.body.ingredients.split(' ')),
                    calories:req.body.calories,
                    total_orders:0,
                }).save((err,cuisine,count)=>{
                    if(err){
                        req.flash('update_err',err);
                        res.redirect('/update_menu');
                    }
                    else{
                        cachified_price[req.body.cuisine_id] = req.body.price;
                        req.flash('update_suc', 'New cuisine has been created.');
                        res.redirect('/update_menu');
                    }
                });
            }
            // target cuisine exists, update the info
            else if(c===1){
                console.log(cuisine);
                const cuisine_modifier = updateCuisine(cuisine[0]);
                cuisine_modifier('price',parseInt(req.body.price));
                cuisine_modifier('ingredients',req.body.ingredients.split(' '));
                cuisine_modifier('calories',req.body.calories);
                cuisine[0].save((err,cui,count)=>{
                    if(err){
                        req.flash('update_err',err);
                        res.redirect('/update_menu');
                    }
                    else{
                        cachified_price[req.body.cuisine_id] = req.body.price;
                        req.flash('update_suc', 'Update success.');
                        res.redirect('/update_menu');
                    }
                });
            }
            else{
                req.flash('update_err','failed to identify the cuisine');
                res.redirect('/update_menu');
            }
        });
    }
});

app.get('/order',(req,res)=> {
    if (res.locals.user === undefined) {
        res.redirect('/index');
    }
    else {
        Cuisine.find({}, (err, cuisine_lst, count) => {
            if (err) {
                console.log(err);
            }
            else {
                const order_history = JSON.parse(res.locals.user.order_history);
                const orders = order_history.slice(order_history.length-5,order_history.length);
                orders.reverse();
                res.render('order', {
                    menu: cuisine_lst,
                    order_history:orders,
                    order_err:req.flash('order_err')[0],
                    order_suc:req.flash('order_suc')[0],
                    user:res.locals.user,
                    display_admin_links:res.locals.user.user_type === 'admin',
                });
            }
        });
    }
});

app.post('/order',(req,res)=>{
    User.find(res.locals.user,(err,user_lst,count)=>{
        const cur_user = user_lst[0];
        const arr = req.body.order_detail.split(' ');
        let total_price = 0;
        let valid_input = true;
        arr.forEach(e=>{
            if(cachified_price[e]===undefined){
                // invalid order
                valid_input = false;
            }
            else{
                total_price += cachified_price[e];
            }
        });
        // order success
        if(valid_input){
            arr.forEach(e=>{
                Cuisine.find({cuisine_id:e},(err,c_lst,count)=>{
                    ++c_lst[0].total_orders;
                    c_lst[0].save((err,c,count)=>{
                        if(err){
                            console.log(err);
                        }
                    });
                });
            });
            const push_new_order_history = userOrderUpdate(cur_user);
            push_new_order_history(req.body.order_detail);
            // generate order
            new Order({
                username: res.locals.user.username,
                order_details:req.body.order_detail,
                status:'not ready',
                total_price: total_price,
            }).save((err,order,count)=>{
                if(err) {
                    console.log(err);
                }
                else{
                    cur_user.save((err,user,count)=>{
                        if(err){
                            console.log(err);
                        }
                        else{
                            res.locals.user.order_history = cur_user.order_history;
                            req.flash("order_suc", "Order received! Your total price is "+total_price+" dollars.");
                            res.redirect('/order');
                        }
                    });
                }
            });
        }
        // invalid input, report back to user
        else{
            req.flash('order_err',"ERROR: Invalid cuisine id detected!");
            res.redirect('/order');
        }
    });
});

app.get('/process_order',(req,res)=>{
    if(res.locals.user===undefined){
        res.redirect('/index');
    }
    else if(res.locals.user.user_type!=='admin'){
        res.redirect('/index');
    }
    else {
        Order.find({},(err,order_lst,count)=>{
            res.render('process_order', {
                user: res.locals.user,
                orders: order_lst,
                display_admin_links:true,
                process_err:req.flash('process_err')[0],
                process_suc:req.flash('process_suc')[0],
            });
        });
    }
});


app.post('/process_order',(req,res)=>{
    Order.find({},(err,o_lst,count)=>{
        if(o_lst.length===0){
            req.flash("process_err","Queue is empty!");
            res.redirect('/process_order');
        }
        else{
            const cur_o = o_lst[0];
            Order.deleteOne(cur_o,(err)=>{
                if(err){
                    req.flash('process_err',err);
                    res.redirect('/process_order');
                }
                else{
                    req.flash('process_suc','The order at the top of queue has been processed.');
                    res.redirect('/process_order');
                }
            });
        }
    });
});

app.get('/manage_users',(req,res)=>{
    if(res.locals.user===undefined){
        res.redirect('/index');
    }
    else if(res.locals.user.user_type!=='admin'){
        res.redirect('/index');
    }
    else {
        res.render('manage_users', {
            manage_err: req.flash('manage_err')[0],
            manage_suc: req.flash('manage_suc')[0],
            display_admin_links:true,
        });
    }
});

app.post('/manage_users',(req,res)=>{
    if(req.body.username1!==req.body.username2){
        req.flash('manage_err',"Username do not match!");
        res.redirect('/manage_users');
    }
    else{
        const username = req.body.username1;
        User.find({username:username},(err,user_lst,count)=>{
            // user not found
            if(user_lst.length===0){
                req.flash('manage_err',"Account not found!");
                res.redirect('/manage_users');
            }
            // user found
            else{
                const user = user_lst[0];
                const change_to_admin_flag = (req.body.admin_button!==undefined);
                console.log(req.body.admin_button);
                if(change_to_admin_flag){
                    user.user_type = 'admin';
                }
                else{
                    user.user_type = 'consumer';
                }
                user.save((err,u,count)=>{
                    if(err){
                        req.flash('manage_err',err);
                        res.redirect('/manage_users');
                    }
                    else{
                        req.flash('manage_suc','Account '+user.username+' has been updated!');
                        res.redirect('/manage_users');
                    }
                })
            }
        });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT);
