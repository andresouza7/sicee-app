const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const config = require('./config/database');

mongoose.connect(config.database);
var db = mongoose.connection;

// Check connection
db.once('open', function(){ 
  console.log('Connected to MongoDB');
});

// Check for DB errors
db.on('error', function(err){
  console.log(err);
});

// Init App
const app = module.exports = express();

// Load View Engine
// app.set('views', path.join(__dirname, 'views'));
// app.engine('ejs', require('express-ejs-extend'));
// app.set('view engine', 'ejs');
// app.engine('html',require('ejs').renderFile);


// =============================================
// MIDDLEWARE BEGINS HERE
// pay attention to the order

// Body Parser Middleware
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

// Set Public Folder
app.use(express.static(path.join(__dirname, 'client')));

// Express Session Middleware
app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true
}));

// Express Messages Middleware
app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

// Express Validator Middleware
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

// Passport Config
require('./config/passport')(passport);
// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

app.get('*', function(req, res, next){
  res.locals.user = req.user || null;
  next();
});

// Socket io Config and export 
var server = require('http').Server(app);
app.io = require('socket.io')(server);

var Agenda = require('agenda');
var agenda = new Agenda({db: {address: config.database}});

// =============================================
// MIDDLEWARE ENDS HERE

// Route APIs
let devices = require('./routes/devices');
let users = require('./routes/users');
let api = require('./routes/api');

app.use('/devices', devices);
app.use('/users', users);
app.use('/api', api); // api for sicee board http connection

// Start Server
function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

// var port = normalizePort(process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || '8080');
var port = process.env.PORT || 8080;
server.listen(port, function(){
  console.log('Server started on port 8080...');
});
