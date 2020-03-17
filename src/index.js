import React, { useState, useEffect } from "react";
import { render } from "react-dom";
import axios from "axios";
import qs from "qs";
const root = document.querySelector("#root");

const App = () => {
  const [auth, setAuth] = useState({});

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    findUserFromToken();
    getUsers();
  }, []);

  const findUserFromToken = () => {
    const token = window.localStorage.getItem("token");
    if (!token) {
      return;
    }
    axios
      .get("/api/auth", {
        headers: {
          authentication: token
        }
      })
      .then(response => setAuth(response.data))
      .catch(ex => console.log(ex));
  };

  const getUsers = () => {
    axios.get("/api/users").then(response => setUsers(response.data));
  };

  const onSubmit = ev => {
    ev.preventDefault();
    const credentials = {
      username,
      password
    };
    axios
      .post("/api/auth", credentials)
      .then(response => {
        window.localStorage.setItem("token", response.data.token);
        findUserFromToken();
      })
      .catch(ex => {
        setError("bad credentials");
      });
  };

  const logout = () => {
    window.localStorage.removeItem("token");
    setAuth({});
    setError("");
    setUsername("");
    setPassword("");
  };

  return (
    <div>
      <h1>Auth App</h1>
      {!auth.id && (
        <form onSubmit={onSubmit}>
          <h2>Login</h2>
          <div className="error">{error}</div>
          <input
            value={username}
            onChange={ev => setUsername(ev.target.value)}
          />
          <input
            type="password"
            value={password}
            onChange={ev => setPassword(ev.target.value)}
          />
          <button>Save</button>
        </form>
      )}
      {auth.id && <button onClick={logout}>Logout {auth.username}</button>}
      <hr />
      {auth.roleId === 2 && (
        <div>
          <h2>List of Users: </h2>
          {users.map(user => {
            return <li key={user.id}>{user.username}</li>;
          })}
        </div>
      )}
    </div>
  );
};

render(<App />, root);
