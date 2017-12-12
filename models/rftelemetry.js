let mongoose = require('mongoose');

let rftelemetrySchema = mongoose.Schema({
  pipe:{
  	type: Number,
  	required: true
  },
  ping:{
    type: Number,
    required: true
  },
  timestamp:{
    type: Date,
    required: true
  }
});

let RfTelemetry = module.exports = mongoose.model('RfTelemetry', rftelemetrySchema, 'rftelemetry');
