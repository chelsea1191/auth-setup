const { Client } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jwt-simple");

const client = new Client(
  process.env.DATABASE_URL || "postgres://localhost/acme_auth_db"
);

client.connect();

const sync = async () => {
  const SQL = `
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  DROP TABLE IF EXISTS users;
  DROP TABLE IF EXISTS roles;
  CREATE TABLE roles(
    id SERIAL PRIMARY KEY,
    rolename VARCHAR(100) NOT NULL
  );
  CREATE TABLE users(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR NOT NULL,
    "roleId" INT REFERENCES roles(id) DEFAULT 1,
    CHECK (char_length(username) > 0)
  );
  INSERT INTO roles (rolename) VALUES ('user');
  INSERT INTO roles (rolename) VALUES ('admin');
  `;
  await client.query(SQL);
  await Promise.all([
    createUser({ username: "moe", password: "MOE", role: 2 }),
    createUser({ username: "lucy", password: "LUCY", role: 1 }),
    createUser({ username: "curly", password: "CURLY", role: 1 })
  ]);
  const token = await authenticate({ username: "lucy", password: "LUCY" });
  const lucyUser = await findUserFromToken(token);
  //console.log(lucyUser);
};

const findUserFromToken = async token => {
  const id = jwt.decode(token, process.env.JWT).id;
  //todo - eventually remove password from user
  return (await client.query(`SELECT * from users WHERE id = $1`, [id]))
    .rows[0];
};

const authenticate = async ({ username, password }) => {
  const user = (
    await client.query(`SELECT * from users WHERE username = $1`, [username])
  ).rows[0];
  await compare({ plain: password, hashed: user.password });
  return jwt.encode({ id: user.id }, process.env.JWT);
};

const compare = async ({ plain, hashed }) => {
  return new Promise((resolve, reject) => {
    bcrypt.compare(plain, hashed, (err, result) => {
      if (err) {
        return reject(err);
      }
      if (result) {
        return resolve();
      }
      reject(Error("bad credentials"));
    });
  });
};

const readUsers = async () => {
  //todo - remove password
  return (await client.query(`SELECT * from users`)).rows;
};

const createUser = async ({ username, password, role }) => {
  const hashed = await hash(password);
  return (
    await client.query(
      `INSERT INTO users(username, password, "roleId" ) values ($1, $2, $3) returning *`,
      [username, hashed, role]
    )
  ).rows[0];
};

const hash = plain => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(plain, 10, (err, hashed) => {
      if (err) {
        return reject(err);
      }
      resolve(hashed);
    });
  });
};

module.exports = {
  sync,
  readUsers,
  authenticate,
  findUserFromToken
};
