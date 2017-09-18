let mongoose = require('mongoose');

// Article Schema
let consumptionSchema = mongoose.Schema({
  deviceId:{
    type: String,
    required: true
  },
  consumption:{
    type: Number,
    required: true
  },
  timestamp:{
    type: Number,
    required: true
  }
});

let Consumption = module.exports = mongoose.model('Consumption', consumptionSchema, 'consumption');
