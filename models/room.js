let mongoose = require('mongoose');

let roomSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  devices:{
    type: Array
  },
  createdAt:{
    type: Date,
    required: true
  }
});

let Room = module.exports = mongoose.model('Room', roomSchema, 'rooms');
