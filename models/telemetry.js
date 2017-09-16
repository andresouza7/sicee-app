let mongoose = require('mongoose');

// Article Schema
let telemetrySchema = mongoose.Schema({
  deviceId:{
    type: String,
    required: true
  },
  power:{
    type: String,
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

let Telemetry = module.exports = mongoose.model('Telemetry', telemetrySchema);
