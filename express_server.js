const express = require("express");
const cookieSession = require("cookie-session");
const bcrypt = require("bcryptjs");
const { getUserByEmail, generateRandomString, urlsForUser } = require("./helpers");
const { urlDatabase, users } = require("./database");
const app = express();
const PORT = 8080;

app.set("view engine", "ejs");
app.use(cookieSession({
  name: 'session',
  keys: ["something secret"]
}));

app.use(express.urlencoded({ extended: true }));


// redirect to home page, or login page if not logged in
app.get("/", (req, res) => {
  if (!users[req.session.userCookie]) {
    return res.redirect("/login");
  }

  res.redirect("/urls");
});


// display login page
// redirect to home page if already logged in
app.get("/login", (req, res) => {
  if (users[req.session.userCookie]) {
    return res.redirect("/urls");
  }

  res.render("login_page");
});


// log users in
// check that forms are all filled out, that the account is already registered, and that the password is correct
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).send("Please fill out all the forms.");
  }

  const userFound = getUserByEmail(email, users);
  if (!userFound) {
    return res.status(403).send("That email isn't registered");
  }

  if (!bcrypt.compareSync(password, userFound.hashedPassword)) {
    return res.status(403).send("Your email and password do not match");
  }
  
  req.session.userCookie = userFound.id;
  res.redirect("/urls");
});


// log out user
// clear all cookies and redirect to log in
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/login");
});


// display register page
// redirect to home page if already logged in
app.get("/register", (req, res) => {
  if (users[req.session.userCookie]) {
    return res.redirect("/urls");
  }

  res.render("user_registration");
});


// register users
// check that forms are all filled in and that account does not already exist
app.post("/register", (req, res) => {
  const userCookie = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;
  const hashedPassword = bcrypt.hashSync(password, 10);

  if (!email || !password) {
    return res.status(400).send("Please fill out all the forms.");
  }

  const userFound = getUserByEmail(email, users);
  if (userFound) {
    return res.status(400).send("That email is already registered!");
  }

  req.session.userCookie = (userCookie);

  users[req.session.userCookie] = {
    id: userCookie,
    email,
    hashedPassword
  };

  res.redirect("/urls");
});


// display the main page that contains urls
// redirect to login page if user is not logged in
app.get("/urls", (req, res) => {
  if (!users[req.session.userCookie]) {
    return res.redirect("/login");
  }

  const templateVars = {
    user: users[req.session.userCookie],
    urls: urlsForUser(req.session.userCookie, urlDatabase)
  };

  res.render("urls_index", templateVars);
});


// display page for creating new urls
// redirects to login page if user is not logged in
app.get("/urls/new", (req, res) => {
  if (!users[req.session.userCookie]) {
    return res.redirect("/login");
  }
  
  const templateVars = {
    user: users[req.session.userCookie],
  };

  res.render("urls_new", templateVars);
});


// adds new short urls into the database with their corresponding long url and the user id of whoever created the url
app.post("/urls", (req, res) => {
  const id = generateRandomString();

  urlDatabase[id] = {
    userId: req.session.userCookie,
    longUrl: req.body.longURL
  };

  res.redirect("/urls");
});


// display page for editing urls
// check that user is logged in and is the owner of the url
app.get("/urls/:id", (req, res) => {
  if (!users[req.session.userCookie]) {
    return res.status(400).send("Please log in to view urls.");
  }

  if (users[req.session.userCookie].id !== urlDatabase[req.params.id].userId) {
    return res.status(400).send("You do not have permission to view this url.");
  }

  const templateVars = {
    user: users[req.session.userCookie],
    id: req.params.id,
    longURL: urlDatabase[req.params.id].longUrl
  };

  res.render("urls_show", templateVars);
});


// edit which long url the short url redirects to
// check that user is logged in and is the owner of the url
app.post("/urls/:id", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    return res.status(400).send("That url does not exist!");
  }

  if (!users[req.session.userCookie]) {
    return res.status(400).send("Please log in to edit urls.");
  }

  if (users[req.session.userCookie].id !== urlDatabase[req.params.id].userId) {
    return res.status(400).send("You do not have permission to edit this url.");
  }

  urlDatabase[req.params.id].longUrl = req.body.update;
  res.redirect("/urls");
});


// delete short urls from home page
// check that user is logged in and is the owner of the url
app.post("/urls/:id/delete", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    return res.status(400).send("That url does not exist!");
  }
  
  if (!users[req.session.userCookie]) {
    return res.status(400).send("Please log in to delete urls.");
  }

  if (users[req.session.userCookie].id !== urlDatabase[req.params.id].userId) {
    return res.status(400).send("You do not have permission to delete this url.");
  }

  delete urlDatabase[req.params.id];
  res.redirect("/urls");
});


// redirects to corresponding long url
app.get("/u/:id", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    return res.status(400).send("That url does not exist!");
  }

  const longURL = urlDatabase[req.params.id].longUrl;
  res.redirect(longURL);
});


app.listen(PORT);