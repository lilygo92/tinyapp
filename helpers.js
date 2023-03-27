const crypto = require("crypto");

const getUserByEmail = (email, database) => {
  for (const key in database) {
    if (database[key].email === email) {
      return database[key];
    }
  }
  return undefined;
};

const generateRandomString = () => {
  const buf = crypto.randomBytes(3);
  return buf.toString("hex");
};

const urlsForUser = (id, database) => {
  const usersUrls = {};
  for (const key in database) {
    if (database[key].userId === id) {
      usersUrls[key] = database[key];
    }
  }

  return usersUrls;
};

module.exports = { getUserByEmail, generateRandomString, urlsForUser };