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

// // const async = require('async');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const Cuisine = mongoose.model('Cuisine');
const Ingredient = mongoose.model('Ingredient');
const Order = mongoose.model('Order');
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
                        order_history: [],
                    }).save((err,user,count)=>{
                        if (err){
                            console.log('error storing user!');
                        }
                        else{
                            console.log('registration success');
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
    console.log(res.locals);
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
   res.render('index',{user:res.locals.user,display_admin_links:display_admin_links});
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
        Ingredient.find({},(err,ings,count)=>{
            if(err){
                console.log('database error, cannot find ingredients');
                res.status(500);
            }
            else{
                // console.log(ings);
                const low_storage = ings.filter(ing=>ing.current_storage<10);
                res.render('storage',{ings:ings,low_storage:low_storage}); // an array of ingredient obj
            }
        });
    }
});

app.post('/storage',(req,res)=>{
    if(!res.locals[user]){
        res.redirect('/index');
    }

    else if(res.locals[user][user_type]!=='admin'){
        res.redirect('/index');
    }
    // valid user
    else{
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
    }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT);
