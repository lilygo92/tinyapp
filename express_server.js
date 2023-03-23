const express = require("express");
const { url } = require("inspector");
const crypto = require("crypto");
const cookieParser = require('cookie-parser')
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");
app.use(cookieParser())

const urlDatabase = {
  "b2xVn2": { longUrl: "http://www.lighthouselabs.ca"},
  "9sm5xK": { longUrl: "http://www.google.com"}
};

const users = {};

const generateRandomString = () => {
    const buf = crypto.randomBytes(3);
    return buf.toString("hex");
}

const getUserByEmail = (email) => {
  for (const key in users) {
    if (users[key].email === email) {
      return users[key];
    }
  }
  return null;
}

const urlsForUser = (id) => {
  const usersUrls = {};
  for (const key in urlDatabase) {
    if (urlDatabase[key].userId === id) {
      usersUrls[key] = urlDatabase[key];
    }
  }

  return usersUrls;
}

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

app.get("/urls", (req, res) => {
  if (!req.cookies["user_id"]){
    return res.status(400).send("Please log in to view urls.");
  }

  const templateVars = { 
    user: users[req.cookies["user_id"]],
    urls: urlsForUser(req.cookies["user_id"])
  };

  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  if (!req.cookies["user_id"]){
    res.redirect("/login");
  }
  
  const templateVars = {
    user: users[req.cookies["user_id"]],
  }
  res.render("urls_new", templateVars);
});

app.post("/urls", (req, res) => {

  const id = generateRandomString(); 

  urlDatabase[id] = {
    userId: req.cookies["user_id"],
    longUrl: req.body.longURL
  };

  console.log(urlDatabase);
  res.redirect("/urls");
});

app.get("/urls/:id", (req, res) => {
  if(!req.cookies["user_id"]) {
    return res.status(400).send("Please log in to view urls.");
  }

  if(req.cookies["user_id"] !== urlDatabase[req.params.id].userId) {
    return res.status(400).send("You do not have permission to view this url.");
  }

  const templateVars = { 
    user: users[req.cookies["user_id"]],
    id: req.params.id, 
    longURL: urlDatabase[req.params.id].longUrl
  };


  res.render("urls_show", templateVars);
});

app.get("/u/:id", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    return res.status(400).send("That url does not exist!")
  };

  const longURL = urlDatabase[req.params.id].longUrl;
  res.redirect(longURL);
});

app.post("/urls/:id", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    return res.status(400).send("That url does not exist!")
  };

  if(!req.cookies["user_id"]) {
    return res.status(400).send("Please log in to edit urls.");
  }

  if(req.cookies["user_id"] !== urlDatabase[req.params.id].userId) {
    return res.status(400).send("You do not have permission to edit this url.");
  }


  urlDatabase[req.params.id].longUrl = req.body.update;
})

app.post("/urls/:id/delete", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    return res.status(400).send("That url does not exist!")
  };
  
  if(!req.cookies["user_id"]) {
    return res.status(400).send("Please log in to delete urls.");
  }

  if(req.cookies["user_id"] !== urlDatabase[req.params.id].userId) {
    return res.status(400).send("You do not have permission to delete this url.");
  }

  delete urlDatabase[req.params.id];
  res.redirect("/urls");
});

app.get("/login", (req, res) => {
  res.render("login_page")
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if(!email || !password) {
    return res.status(400).send("Please fill out all the forms.");
  }

  const userFound = getUserByEmail(email);
  if (!userFound){
    return res.status(403).send("That email isn't registered");
  } 
  
  res.cookie("user_id", userFound.id);
  res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/login");
});

app.get("/register", (req, res) => {
  res.render("user_registration");
});

app.post("/register", (req, res) => {
  const user_id = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;

  if(!email || !password) {
    return res.status(400).send("Please fill out all the forms.");
  }
  
  const userFound = getUserByEmail(email)
  if (userFound) {
    return res.status(400).send("That email is already registered!");
  }

  users[user_id] = {
    id: user_id,
    email,
    password
  };

  res.cookie("user_id", user_id);
  res.redirect("/urls")
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});