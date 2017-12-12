const mongoose = require('mongoose');

// User Schema
const UserSchema = mongoose.Schema({
  name:{
    type: String,
    required: true
  },
  email:{
    type: String
  },
  username:{
    type: String,
    required: true
  },
  password:{
    type: String,
    required: true
  },
  phone:{
    type: String
  }
});

const User = module.exports = mongoose.model('User', UserSchema, 'users');
