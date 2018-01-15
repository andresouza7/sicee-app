let mongoose = require('mongoose');

// Telemetry Schema
let telemetrySchema = mongoose.Schema({
  measureId:{
    type: String, //mongoose.Schema.ObjectId
    required: true
  },
  deviceId:{
    type: String,
    required: true
  },
  power:{
    type: Number,
    required: true
  },
  voltage:{
    type: Number,
    required: true
  },
  current:{
    type: Number,
    required: true
  },
  consumption:{
    type: Number,
    required: true
  },
  timestamp:{
    type: Date,
    required: true
  }
});
// This argument will be the collection name in the database
let Telemetry = module.exports = mongoose.model('Telemetry', telemetrySchema, 'telemetry');
