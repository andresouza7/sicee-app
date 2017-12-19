let mongoose = require('mongoose');

let logSchema = mongoose.Schema({
  event: {
    type: String,
    required: true
  },
  timestamp:{
    type: Date,
    required: true
  }
});

let Log = module.exports = mongoose.model('Log', logSchema, 'logs');
