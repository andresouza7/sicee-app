let mongoose = require('mongoose');

// Article Schema
let consumptionSchema = mongoose.Schema({
  deviceId:{
    type: String,
    required: true
  },
  roomId:{
    type: String,
    required: true
  },
  consumption:{
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

let Consumption = module.exports = mongoose.model('Consumption', consumptionSchema, 'consumption');
