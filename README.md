# Restaurant Manager App

## Demo Site
[Restaurant Manager App](https://infinite-hamlet-95167.herokuapp.com/index)

Initial admin account detail:
```
username: boss
password: admin
```
(Please do NOT modify any settings in the website, this site is purpose for _demo_ purpose.)

## Overview
Operating and maintaining a restaurant is not a easy job, especially for new fast food restaurant owners. More than often, the restaurants owners would always run into the following questions: How do we keep track of current storage for each ingredients in real-time and keep customers informed of which choices is out of stock? How can we reduce customer waiting time to literally zero seconds within a few taps on finger and help customers to order their meal efficiently? What are my business performance data such as: today's income, customers most favorite orders, etc.

Restaurant Manager App is a web application that saves the costs for fast food restaurant owners from deploying human resources to perform the above tasks and taken care of all these issues in real-time. There will be two types of target users: regular customers and restaurant owner.

### Data Model
The application will use the MongoDB to store user, cuisine, ingredients, and orders.

* User can have two types: consumer and admin.
  * All users (including administer) have a username and password.
  * All users password will be hashed and added salt before saved into the database.
  * User can see their order histories.
* Cuisine has an associated name, id, price, required ingredients, calories, and total orders to record how many times this cuisine has been ordered.
* Ingredient has an associated name and a record to keep track of current storage.
* Order has keeps the consumer's username, order id, order details, status of order, and the total price of the order.

User MongoDB database setup code:
```javascript
{
username: // account username
password/hash: // account password
user_type: // user type: consumer or admin
order_history: // an array of references to previous orders object from this account
}
```
Cuisine MongoDB database setup code:
```javascript
{
cuisine: // name of the cuisine
cuisine_id: // id of the cuisine
price: // price of this cuisine
ingredients: // an array of ingredients names required for this cuisine
calories: // calories of the cuisine
total_orders: // total order numbers of this cuisine
}
```
Ingredients MongoDB database setup code:
```javascript
{
ingredient_name: // name of the Ingredient
current_storage: // current storage of this ingredient
}
```
Orders MongoDB database setup code:
```javascript
{
  username: // consumer's username
  order_id: // order id number
  order_details: // an array of references to cuisines ids
  status: // a string of order status
  total_price: // total price of this order
}
```
### Wireframes
/index - Welcome and login/register page for the app.

![index.png](https://github.com/szwalker/Restaurant-Manager-App/blob/master/Documentation/index.png?raw=true "Index Page")

/order - Food ordering page.

![order.png](https://github.com/szwalker/Restaurant-Manager-App/blob/master/Documentation/order.png?raw=true "Order Page")

/process_order - View orders and update order status

![process_order.png](https://github.com/szwalker/Restaurant-Manager-App/blob/master/Documentation/process_order.png?raw=true "Process_Order Page")

/manage_users - Check user's previous orders, delete user account

![manage_users.png](https://github.com/szwalker/Restaurant-Manager-App/blob/master/Documentation/manage_users.png?raw=true "Manage_Users Page")

/storage - Check and update storage for ingredients

![storage.png](https://github.com/szwalker/Restaurant-Manager-App/blob/master/Documentation/storage.png?raw=true "Storage Page")

/update_menu - Edit menu information

![update_menu.png](https://github.com/szwalker/Restaurant-Manager-App/blob/master/Documentation/update_menu.png?raw=true "Update Menu Page")


### Site Map
![Site Map](https://github.com/szwalker/Restaurant-Manager-App/blob/master/Documentation/site_map.png?raw=true "Restaurant Manager App Site Map")

### User Stories or Use Cases
* As a non-registered user, I can see the menu and location of the restaurant.
* As a new user, I can register an account on the website.
* As a registered user, I can order foods from the restaurant.
* As administer user, I can process orders in order.
* As administer user, I can manage users by reset password, check purchase history, and delete account.
* As administer user, I can modify the menu by adding/deleting meal options and setting discounts.
* As administer user, I can check and change ingredients storage information.

### Research Topics
Integrate user authentication Using passport
  * Potential modules: passport for user authentication
  * This is required for the application to determine whether the user exists and the corresponding user type.
  * See `/index` for both register and login page.

Flash Library
  * Display feedback back to the user during remove cuisine from menu, deleting accounts, register, login.
  * see `/index`, `/update_menu`, `/manage_users` pages for detail.

JQuery Library
  * Perform animation effect on user validation
  * Using a CSS preprocesser would give the user a better interactive feeling from the application.
  * See `/index` for both register and login button.

### References
  * [Express 4.x app using Passport for authentication with username and password](https://github.com/passport/express-4.x-local-example/blob/master/server.js)
  * [Passport-Local Mongoose](https://github.com/saintedlama/passport-local-mongoose)
  * [Some quick tips for Passport]( https://www.raymondcamden.com/2016/06/23/some-quick-tips-for-passport)
  * [Learn how to handle authentication with Node using Passport.js](https://medium.freecodecamp.org/learn-how-to-handle-authentication-with-node-using-passport-js-4a56ed18e81e)
  * [Easy Node Authentication: Setup and Local](https://scotch.io/tutorials/easy-node-authentication-setup-and-local)
  * [Flash API from NPM](https://www.npmjs.com/package/flash)
  * [JQuery Tutorial from w3schools](https://www.w3schools.com/jquery/)
