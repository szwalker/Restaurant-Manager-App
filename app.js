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
Q = []; // a global Queue for orders
// // const async = require('async');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const Cuisine = mongoose.model('Cuisine');
const Ingredient = mongoose.model('Ingredient');
const bodyParser = require('body-parser');
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
                });
            }
        });
    }
});

// verify whether the order is valid (not contain any invalid cuisine id)
function verify_cuisine_id(arr,i){
    console.log(i);
    if (i===0){
        console.log('test point 1');
        Cuisine.find({cuisine_id:arr[0]},(err,c_lst,count)=>{
            return c_lst.length !== 0;
        });
    }
    else{
        console.log('test point 2');
        Cuisine.find({cuisine_id:arr[i]},(err,c_lst,count)=>{
            console.log('test point 5');
            if(c_lst.length===0){
                console.log('test point 3');
                return false;
            }
            else{
                console.log('test point 4');
                return verify_cuisine_id(arr,i-1);
            }
        });
    }
}

app.post('/order',(req,res)=>{
    User.find(res.locals.user,(err,user_lst,count)=>{
        const cur_user = user_lst[0];
        const push_new_order_history = userOrderUpdate(cur_user);
        push_new_order_history(req.body.order_detail);
        cur_user.save((err,user,count)=>{
            if(err){
                console.log(err);
            }
            // order success
            else{
                const arr = req.body.order_detail.split(' ');
                // increment order counts for each cuisine
                arr.forEach(e => {
                    Cuisine.find({cuisine_id: e}, (err, c_lst, count) => {
                        if(c_lst.length===0){
                            req.flash('order_err',"Invalid cuisine id detected!");
                        }
                        else{
                            ++c_lst[0].total_orders;
                            c_lst[0].save((err, c, count) => {
                                if (err) {
                                    console.log(err);
                                }
                            });
                        }
                    })
                });
                // push to global order Queue
                Q.push(req.body.order_detail);
                res.locals.user.order_history = cur_user.order_history;
                req.flash("order_suc", "Order received!");
                res.redirect('/order');
            }
        })
    });
});



const PORT = process.env.PORT || 5000;
app.listen(PORT);
