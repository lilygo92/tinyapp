const express = require("express");
const { url } = require("inspector");
const cookieSession = require("cookie-session");
const { getUserByEmail, generateRandomString, urlsForUser } = require("./helpers");
const bcrypt = require("bcryptjs");
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");
app.use(cookieSession({
  name: 'session',
  keys: ["something secret"]
}));

const urlDatabase = {}; 
const users = {}; // users database

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Hello!");
});


app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});


app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});


app.get("/login", (req, res) => {
  if (req.session["userCookie"]) {
    return res.redirect("/urls");
  }

  res.render("login_page");
});


app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  // check that both email and password forms were filled in
  if (!email || !password) {
    return res.status(400).send("Please fill out all the forms.");
  }

  // check that submitted email exists in users database
  const userFound = getUserByEmail(email, users);
  if (!userFound) {
    return res.status(403).send("That email isn't registered");
  }

  // check that submitted password is correct
  if (!bcrypt.compareSync(password, userFound.hashedPassword)) {
    return res.status(403).send("Your email and password do not match");
  }
  
  req.session.userCookie = userFound.id;
  res.redirect("/urls");
});


app.post("/logout", (req, res) => {
  // clear all cookies
  req.session = null;
  res.redirect("/login");
});


app.get("/register", (req, res) => {
  if (req.session["userCookie"]) {
    return res.redirect("/urls");
  }

  res.render("user_registration");
});


app.post("/register", (req, res) => { 
  const userCookie = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;
  const hashedPassword = bcrypt.hashSync(password, 10);

  // check that both email and password forms were filled in
  if (!email || !password) {
    return res.status(400).send("Please fill out all the forms.");
  }
  
  // check that email is not already registered
  const userFound = getUserByEmail(email, users);
  if (userFound) {
    return res.status(400).send("That email is already registered!");
  }

  // add user info to users database
  users[userCookie] = {
    id: userCookie,
    email,
    hashedPassword
  };

  req.session.userCookie = (userCookie);
  res.redirect("/urls");
});


app.get("/urls", (req, res) => { // main page for viewing urls
  // redirect to login page if not logged in
  if (!req.session["userCookie"]) {
    return res.redirect("/login");
  }

  const templateVars = {
    user: users[req.session["userCookie"]],
    urls: urlsForUser(req.session["userCookie"], urlDatabase)
  };

  res.render("urls_index", templateVars);
});


app.get("/urls/new", (req, res) => { // page for making new urls
  // redirect to login page if not logged in
  if (!req.session["userCookie"]) {
    res.redirect("/login");
  }
  
  const templateVars = {
    user: users[req.session["userCookie"]],
  };

  res.render("urls_new", templateVars);
});


app.post("/urls", (req, res) => { // add new short urls
  const id = generateRandomString();

  urlDatabase[id] = {
    userId: req.session["userCookie"], // attaches url to the id of its creator
    longUrl: req.body.longURL
  };

  console.log(urlDatabase);
  res.redirect("/urls");
});


app.get("/urls/:id", (req, res) => { // page for editing short urls
  // check that user is logged in
  if (!req.session["userCookie"]) {
    return res.status(400).send("Please log in to view urls.");
  }

  // check that the url was made by the user trying to access it
  if (req.session["userCookie"] !== urlDatabase[req.params.id].userId) {
    return res.status(400).send("You do not have permission to view this url.");
  }

  const templateVars = {
    user: users[req.session["userCookie"]],
    id: req.params.id,
    longURL: urlDatabase[req.params.id].longUrl
  };


  res.render("urls_show", templateVars);
});


app.get("/u/:id", (req, res) => { // redirect to long urls
  if (!urlDatabase[req.params.id]) {
    return res.status(400).send("That url does not exist!");
  }

  const longURL = urlDatabase[req.params.id].longUrl;
  res.redirect(longURL);
});


app.post("/urls/:id", (req, res) => { // edit short urls
  if (!urlDatabase[req.params.id]) {
    return res.status(400).send("That url does not exist!");
  }

  // check that user is logged in
  if (!req.session["userCookie"]) {
    return res.status(400).send("Please log in to edit urls.");
  }

  // check that the url was made by the user trying to edit it
  if (req.session["userCookie"] !== urlDatabase[req.params.id].userId) {
    return res.status(400).send("You do not have permission to edit this url.");
  }

  urlDatabase[req.params.id].longUrl = req.body.update;
});

app.post("/urls/:id/delete", (req, res) => { // delete short urls
  if (!urlDatabase[req.params.id]) {
    return res.status(400).send("That url does not exist!");
  }
  
  // check that user is logged in
  if (!req.session["userCookie"]) {
    return res.status(400).send("Please log in to delete urls.");
  }

  // check that the url was made by the user trying to delete it
  if (req.session["userCookie"] !== urlDatabase[req.params.id].userId) {
    return res.status(400).send("You do not have permission to delete this url.");
  }

  delete urlDatabase[req.params.id];
  res.redirect("/urls");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});