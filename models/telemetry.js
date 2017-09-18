let mongoose = require('mongoose');

// Article Schema
let telemetrySchema = mongoose.Schema({
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
  timestamp:{
    type: Number,
    required: true
  }
});
// Thir argument will be the collection name in the database
let Telemetry = module.exports = mongoose.model('Telemetry', telemetrySchema, 'telemetry');
