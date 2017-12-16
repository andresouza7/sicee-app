const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');

// Bring in User Model
let User = require('../models/user');

// Update user password
router.post('/password', function(req,res){
  let userId = req.body._id;
  let new_password = req.body.password;

  bcrypt.genSalt(10, function(err, salt){
    bcrypt.hash(new_password, salt, function(err, hash){
      if(err){
        console.log(err);
      }
      new_password = hash;
      User.update({_id: userId},{password: new_password}).exec(function (err, response){
        if(err)
          res.send(err);
        else
          res.send(response);
      });
    });
  });
});

// Register new user Proccess
router.post('/register', function(req, res){
  const name = req.body.name;
  const email = req.body.email;
  const username = req.body.username;
  const password = req.body.password;
  const password2 = req.body.password2;

  req.checkBody('name', 'Name is required').notEmpty();
  // req.checkBody('email', 'Email is required').notEmpty();
  // req.checkBody('email', 'Email is not valid').isEmail();
  // req.checkBody('phone','Phone is required').notEmpty();
  req.checkBody('username', 'Username is required').notEmpty();
  req.checkBody('password', 'Password is required').notEmpty();
  req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

  let errors = req.validationErrors();

  User.find({username: username}).exec(function (err, user){
    if (user.length) {
      console.log(user);
      let feedback={errors};
      if (errors) {
        errors.push({
          param: username,
          msg:"username already exists"
        });
      } else {
        errors = [];
        errors.push({
          param: "username",
          msg:"username already exists",
          value: username
        });
        feedback.errors = errors;
      }
      res.send(feedback);
    } else {
      if(errors){
        res.send({errors});
        console.log(errors);
      } else {
        let newUser = new User({
          name:name,
          email:email,
          username:username,
          password:password
        });
    
        bcrypt.genSalt(10, function(err, salt){
          bcrypt.hash(newUser.password, salt, function(err, hash){
            if(err){
              console.log(err);
            }
            newUser.password = hash;
            newUser.save(function(err){
              if(err){
                console.log(err);
                res.send(500);
                return;
              } else {
                res.send(req.newUser);
              }
            });
          });
        });
      }
    }
  });
});

// Login Process
router.post('/login', passport.authenticate('local'),function(req,res){
  if (req.user) {
    var dataToSend = {_id:"",name:"",username:"",email:"",phone:""}
    dataToSend._id = req.user._id;
    dataToSend.name = req.user.name;
    dataToSend.email = req.user.email;
    dataToSend.phone = req.user.phone;
    dataToSend.username = req.user.username;
    res.send(dataToSend);
  } else
  res.sendStatus(500);
});

// Update user data other than password
router.put('/',function(req,res){
  let new_data = req.body; // angular takes care of input validation
  User.update({_id: req.body._id},new_data).exec(function(err, response){
    if (err)
      console.log(err);
  });
  res.sendStatus(200);
});

module.exports = router;