// app.js
require('./db.js');
const path = require('path');
const public_path = path.join(__dirname,'public');
const express = require('express');
const app = express();
const bodyParser = require('bodyParser');
const session = require('express-session');
sessionOptions = {
  secret: 'this is my secret',
  resave: true,
  saveUnitialized: true,
}
app.set('view engine','hbs');
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static(public_path));
app.use(session(sessionOptions));

app.get('/',(req,res)=>{
  res.redirect('/index')
});

app.get('/index',(req,res)=>{
  res.render('index',);
})
