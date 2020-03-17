const express = require("express");
const app = express();
const path = require("path");
app.use(express.json());

const db = require("./db");

app.use("/dist", express.static(path.join(__dirname, "dist")));
app.use("/assets", express.static(path.join(__dirname, "assets")));

app.get("/", (req, res, next) =>
  res.sendFile(path.join(__dirname, "index.html"))
);

app.use((req, res, next) => {
  if (!req.headers.authentication) {
    return next();
  }
  db.findUserFromToken(req.headers.authentication)
    .then(user => {
      req.user = user;
      next();
    })
    .catch(next);
});

const isAdmin = (req, res, next) => {
  if (req.user.roleId === 2) {
    console.log("user is admin");
  } else {
    console.log("user is NOT admin");
  }
  next();
};

const isLoggedIn = (req, res, next) => {
  if (!req.user) {
    const err = Error("not authenticated");
    err.status = 401;
    return next(err);
  }
  next();
};

app.get("/api/auth", isLoggedIn, isAdmin, (req, res, next) => {
  console.log("get/auth: ", req.user);
  res.send(req.user);
});

app.get("/api/users", (req, res, next) => {
  db.readUsers()
    .then(users => res.send(users))
    .catch(next);
});

app.post("/api/auth", (req, res, next) => {
  db.authenticate(req.body)
    .then(token => res.send({ token }))
    .catch(next);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).send({ message: err.message });
});

db.sync().then(() => {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(port);
  });
});
