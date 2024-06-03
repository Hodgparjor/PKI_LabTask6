const { google } = require('googleapis');
const express = require('express');
const OAuth2Data = require('./google_key.json');
const axios = require('axios');
const path = require('path');

const app = express();

const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const GITHUB_CLIENT_ID = "Ov23livlzuq6YoIJxQds";
const GITHUB_CLIENT_SECRET = "097b444be279d5c1a4c5d8e6aafc4d169711b44e";

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
var authed = false;
var google_authed = false;
var github_authed = false;

var userData;
var userTable;

const { Pool } = require("pg");
const dotenv = require("dotenv");
dotenv.config();

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
    ssl: true
});
 
const connectDb = async () => {
    try {
        await pool.connect();
    } catch (error) {
        console.log(error);
    }
};
 
connectDb();

const loginPage = () => `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="/css/bootstrap.min.css" rel="stylesheet">
  <title>Login</title>
</head>
<body>
<div class="container mt-4">
  <div class="row justify-content-center">
    <div class="col-md-6">
      <div class="card">
        <div class="card-header">
          <h3 class="text-center">PKI Task 7</h3>
        </div>
        <div class="card-body text-center">
          <p>Please choose a login method:</p>
          <a href="/login" class="btn btn-danger btn-block">
            <i class="fab fa-google"></i> Login with Google
          </a>
          <br>
          <a href="https://github.com/login/oauth/authorize?client_id=Ov23livlzuq6YoIJxQds" class="btn btn-dark btn-block mt-2">
            <i class="fab fa-github"></i> Login with GitHub
          </a>
        </div>
      </div>
    </div>
  </div>
</div>
<script src="/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;

const renderPage = (loggedUser, table, picture = null) => `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="/css/bootstrap.min.css" rel="stylesheet">
  <title>Users</title>
</head>
<body>
<nav class="navbar navbar-expand-lg navbar-light bg-light">
  <div class="container-fluid">
    <a class="navbar-brand" href="#">PKI Task 7</a>
    <div class="collapse navbar-collapse" id="navbarNav">
      <ul class="navbar-nav ml-auto">
        <li class="nav-item">
          <span class="nav-link">Logged in as: ${loggedUser}</span>
        </li>
        <li class="nav-item">
          ${picture ? `<img src="${picture}" class="rounded-circle" height="30" width="30">` : ''}
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/logout">Logout</a>
        </li>
      </ul>
    </div>
  </div>
</nav>
<div class="container mt-4">
  <div id="user-table">${table}</div>
</div>
<script src="/js/bootstrap.bundle.min.js"></script>
</body>
</html>
`;

const getUsers = async () => {
  console.log('Pobieram dane...');
  try {
      const result = await pool.query('SELECT * FROM public.Users');
      console.log('Dostałem dane:');
      let tableContent = `
          <table class="table table-striped">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Joined</th>
                <th>Last Visit</th>
                <th>Counter</th>
              </tr>
            </thead>
            <tbody>
      `;
      result.rows.forEach(row => {
          tableContent += `
              <tr>
                <td>${row.id}</td>
                <td>${row.name}</td>
                <td>${row.joined}</td>
                <td>${row.lastvisit}</td>
                <td>${row.counter}</td>
              </tr>
          `;
      });
      tableContent += '</tbody></table>';
      return tableContent;
  } catch (error) {
      console.error('Error executing query', error.stack);
      throw error;
  }
};

const renderModal = (title, message) => `
<div class="modal" tabindex="-1" role="dialog">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">${title}</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <p>${message}</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
      </div>
    </div>
  </div>
</div>
`;

const handleLogin = (username, res) => {
    const currentDate = new Date().toISOString();
  
    pool.query('SELECT * FROM public.Users WHERE name = $1', [username], (error, result) => {
      if (error) {
        //Wres.send(renderModal('Error', 'Failed to connect to the database.'));
        throw error;
      }
  
      if (result.rows.length === 0) {
        pool.query('INSERT INTO public.Users (name, joined, lastvisit, counter) VALUES ($1, $2, $3, $4)', [username, currentDate, currentDate, 1], (error, result) => {
          if (error) {
            res.write(renderModal('Error', 'Failed to insert new user.'));
            throw error;
          }
          console.log('Dodano nowego użytkownika:', username);
          res.write(renderModal('Success', 'User added successfully.'));
        });
      } else {
        const userId = result.rows[0].id;
        pool.query('UPDATE public.Users SET lastvisit = $1, counter = counter + 1 WHERE id = $2', [currentDate, userId], (error, result) => {
          if (error) {
            //res.send(renderModal('Error', 'Failed to update user.'));
            throw error;
          }
          console.log('Zaktualizowano dane użytkownika:', username);
          //(new bootstrap.Modal(renderModal("Success", "User updated successfully"))).show();
          let modal = renderModal("Success", "User updated successfully")
          //res.send(modal);
          res.write(renderModal('Success', 'User updated successfully.'));
        });
      }
    });
};

app.get('/', async (req, res) => {
    //bootstrap.showModal({title: "Hello World!", body: "A very simple modal dialog without buttons."})
    if (!authed) {
        //res.send('<a href="/login">Login with Google</a><a href="https://github.com/login/oauth/authorize?client_id='+ GITHUB_CLIENT_ID+'"> Login with Github</a>');
        res.send(loginPage());
    } else {
        userTable = await getUsers();
        if(google_authed) {
            var oauth2 = google.oauth2({auth: oAuth2Client, version: 'v2'});
            oauth2.userinfo.v2.me.get(function(err, result) {
                if(err) {
                    console.log('Error:');
                    console.log(err);
                    res.send('Error occurred');
                } else {
                    loggedUser = result.data.name;
                    console.log(loggedUser);
                    res.send(renderPage(loggedUser, userTable, result.data.picture));
                }
            });
        }
        else if (github_authed) {
            if(userData == null) {
                console.log('Error:');
                    console.log(err);
                    res.send('Error occurred');
            } else {
                loggedUser = userData.name;
                res.send(renderPage(loggedUser, userTable));
            }
        }
    }
});

app.get('/login', (req, res) => {
    const url = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/userinfo.profile'
    });
    console.log(url)
    res.redirect(url);
});

app.get('/auth/google/callback', function (req, res) {
    const code = req.query.code
    if (code) {
        // Get an access token based on our OAuth code
        oAuth2Client.getToken(code, function (err, tokens) {
            if (err) {
                console.log('Error authenticating')
                console.log(err);
            } else {
                console.log('Successfully authenticated');
                oAuth2Client.setCredentials(tokens);
                authed = true;
                google_authed = true;
                var oauth2 = google.oauth2({auth: oAuth2Client, version: 'v2'});
                oauth2.userinfo.v2.me.get(function(err, result) {
                    console.log("Google login.");
                    if(err) {
                        console.log('Error:');
                        console.log(err);
                        res.send('Error occurred');
                    } else {
                        handleLogin(result.data.name, res);
                        res.redirect('/');
                    }
                });
            }
        });
    }
});

app.get('/github/callback', (req, res) => {
    const requestToken = req.query.code
    
    axios({
      method: 'post',
      url: `https://github.com/login/oauth/access_token?client_id=${GITHUB_CLIENT_ID}&client_secret=${GITHUB_CLIENT_SECRET}&code=${requestToken}`,
      headers: {
           accept: 'application/json'
      }
    }).then((response) => {
      access_token = response.data.access_token
      res.redirect('/success');
    });
});

app.get('/success', function(req, res) {
    github_authed = true;
    authed = true;
    axios({
      method: 'get',
      url: `https://api.github.com/user`,
      headers: {
        Authorization: 'token ' + access_token
      }
    }).then((response) => {
        userData = response.data;
        handleLogin(userData.username, res);
        res.redirect('/');
    });
});

app.get('/logout', (req, res) => {
    authed = false;
    github_authed = false;
    google_authed = false;
    res.redirect('/');
});

app.get('/css/bootstrap.min.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'node_modules/bootstrap/dist/css/bootstrap.min.css'));
});

app.get('/js/bootstrap.bundle.min.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'node_modules/bootstrap/dist/js/bootstrap.bundle.min.js'));
});

const port = process.env.port || 3000;
app.listen(port, () => console.log(`Server running at ${port}`));
