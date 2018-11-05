// db.js
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/restaurant-manager-app"
const mongoose = require('mongoose');

// my schema goes here!
const User = new Mongoose.Schema({
  username: String,
  password: String,
  user_type: String,
  order_history: [Orders],
});

const Cuisine = new Mongoose.Schema({
  cuisine: String,
  cuisine_id: String,
  price: Number,
  ingredients: [Ingredients],
  calories: Number,
  total_orders: 0,
});

const Ingredients = new Mongoose.Schema({
  ingredient_name: String,
  current_storage: 0,
});

const Orders = new Mongoose.Schema({
  username: String,
  order_id: String,
  order_details: [Cuisine],
  status: 'Not Ready',
  total_price: Number,
});

mongoose.model('User',User);
mongoose.model('Cuisine',Cuisine);
mongoose.model('Ingredients',Ingredients);
mongoose.model('Orders',Orders);
mongoose.connect(MONGODB_URI);
