// var express = require('express');
// var app = express();
// app.get('/', function (req, res) {
//   res.send('Hello World!');
// });
// app.listen(3000, function () {
//   console.log('Example app listening on port 3000!');
// });

const { google } = require('googleapis');
const express = require('express')
const OAuth2Data = require('./google_key.json')
const axios = require('axios')

const app = express()

const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const GITHUB_CLIENT_ID = "Ov23livlzuq6YoIJxQds";
const GITHUB_CLIENT_SECRET = "097b444be279d5c1a4c5d8e6aafc4d169711b44e";

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
var authed = false;
var google_authed = false;
var github_authed = false;

var userData;

app.get('/', (req, res) => {
    if (!authed) {
        res.send('<a href="/login">Login with Google</a><a href="https://github.com/login/oauth/authorize?client_id= '+ GITHUB_CLIENT_ID+'"> Login with Github</a>');
    } else {
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
                    res.send('Logged in: '.concat(loggedUser, ' <img src="', result.data.picture, '" height="23" width="23"> <br><a href="/logout">Logout</a>'))
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
                res.send('Logged in: '.concat(loggedUser, '<br><a href="/logout">Logout</a>'))
            }
        }
        
    }
})

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
                res.redirect('/')
            }
        });
    }
});

app.get('/github/callback', (req, res) => {

    // The req.query object has the query params that were sent to this route.
    const requestToken = req.query.code
    
    axios({
      method: 'post',
      url: `https://github.com/login/oauth/access_token?client_id=${GITHUB_CLIENT_ID}&client_secret=${GITHUB_CLIENT_SECRET}&code=${requestToken}`,
      // Set the content type header, so that we get the response in JSON
      headers: {
           accept: 'application/json'
      }
    }).then((response) => {
      access_token = response.data.access_token
      res.redirect('/success');
    })
  });

  app.get('/success', function(req, res) {
    github_authed=true;
    authed=true;
    axios({
      method: 'get',
      url: `https://api.github.com/user`,
      headers: {
        Authorization: 'token ' + access_token
      }
    }).then((response) => {
        userData = response.data;
        res.redirect('/');
    })
  });   

  

app.get('/logout', (req, res) => {
    authed = false;
    github_authed = false;
    google_authed = false;
    res.redirect('/');
});

const port = process.env.port || 3000
app.listen(port, () => console.log(`Server running at ${port}`));