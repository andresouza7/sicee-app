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
const app = express();

// Bring in Models
let Article = require('./models/article');

// Load View Engine
app.set('views', path.join(__dirname, 'views'));
app.engine('ejs', require('express-ejs-extend'));
app.set('view engine', 'ejs');
app.engine('html',require('ejs').renderFile);


// =============================================
// MIDDLEWARE BEGINS HERE
// pay attention to the order

// Body Parser Middleware
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

// Set Public Folder
app.use(express.static(path.join(__dirname, 'public')));

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

// Socket io Config
var server = require('http').Server(app);
var io = require('socket.io')(server);

// Socket io Middleware
io.on('connection', function(socket){
  // console.log('a user connected');
  socket.on('notification', function(msg){
    console.log('msg: '+msg);
    io.emit('notification', msg);
  });
});

app.post('/', function(req, res){
  console.log(req.body);
  io.emit('notification', JSON.stringify(req.body));
  res.send(200);
});

// AGENDA
// const Agenda = require('agenda');
// var mongoConnectionString = config.database;
// var agenda = new Agenda({db: {address: mongoConnectionString}});

// // RESUME STOPEED TASKS
// agenda.on('ready', function() {
//     agenda.jobs({nextRunAt: {$ne:null}}, function(err, jobs) {
//     console.log(jobs[0].attrs.name);
//     agenda.define(jobs[0].attrs.name, function(job, done) {
//       // User.remove({lastLogIn: { $lt: twoDaysAgo }}, done);
//       console.log('initiating task...');
//       done();
//     });
//     agenda.every(jobs[0].attrs.repeatInterval, jobs[0].attrs.name);
//     agenda.processEvery('10 seconds');
//     agenda.start();
//   });
// });

var Agenda = require('agenda');
var Agendash = require('agendash');

var agenda = new Agenda({db: {address: config.database}});


// =============================================
// MIDDLEWARE ENDS HERE

// Home Route
// app.get('/', function(req, res){
//   Article.find({}, function(err, articles){
//     if(err){
//       console.log(err);
//     } else {
//       res.render('index', {
//         title:'Articles',
//         articles: articles
//       });
//     }
//   });
// });

// Route Files
let index = require('./routes/index');
let articles = require('./routes/articles');
let devices = require('./routes/devices');
let users = require('./routes/users');
let api = require('./routes/api');
let schedule = require('./routes/agenda');
let telemetry = require('./routes/telemetry');
let alerts = require('./routes/alerts');
let automation = require('./routes/automation');
let control = require('./routes/control');

app.use('/', index);
app.use('/articles', articles);
app.use('/devices', devices);
app.use('/users', users);
app.use('/api', api);
app.use('/telemetry', telemetry);
app.use('/agendash', Agendash(agenda));
app.use('/automation', automation);
app.use('/schedule', schedule);
app.use('/alerts', alerts);
app.use('/control',control);

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
