const MONGODB_URI = process.env.MONGODB_URI;
const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const User = new mongoose.Schema({
    username: String,// account username,
    password: {type: String, unique: true, required: true},// account password
    user_type: String,// user type: consumer or admin
    order_history: [], // an array of references to previous orders object from this account
});

const Cuisine = new mongoose.Schema({
    cuisine: String, // name of the cuisine
    cuisine_id: Number, // id of the cuisine
    price: Number, // price of this cuisine
    ingredients: [], // an array of ingredients names required for this cuisine
    calories: Number, // calories of the cuisine
    total_orders: Number, // total order numbers of this cuisine
});

const Ingredient = new mongoose.Schema({
    ingredient_name: String, // name of the Ingredient
    current_storage: String, // current storage of this ingredient
});

const Order = new mongoose.Schema({
    username: String,// consumer's username
    order_id: Number, // order id number
    order_details: [], // an array of references to cuisines ids
    status: String, // a string of order status
    total_price: Number, // total price of this order
});

mongoose.model('User', User);
mongoose.model("Cuisine",Cuisine);
mongoose.model("Ingredient", Ingredient);
mongoose.model("Order", Order);

User.plugin(passportLocalMongoose);

mongoose.connect(MONGODB_URI);