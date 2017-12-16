let mongoose = require('mongoose');

// Article Schema
let telemetrySchema = mongoose.Schema({
  deviceId:{
    type: mongoose.Schema.ObjectId,
    required: true
  },
  deviceName:{
    type: String,
    required: true
  },
  radioconn:{
    type: Boolean,
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
    type: Date,
    required: true
  },
  month:{
    type:Number,
    required: true
  },
  day:{
    type:Number,
    required: true
  },
  hour:{
    type:Number,
    required: true
  }
});
// Thir argument will be the collection name in the database
let Telemetry = module.exports = mongoose.model('Telemetry', telemetrySchema, 'telemetry');
