let mongoose = require('mongoose'), Schema = mongoose.Schema;

// Measure Model
var Measure = require('../models/measure');

let roomSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  devices:{
    type: Array
  },
  measures: {
    type: Array,
  },
  createdAt:{
    type: Date,
    required: true
  }
});

let Room = module.exports = mongoose.model('Room', roomSchema, 'rooms');
