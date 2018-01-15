let mongoose = require('mongoose');

// Article Schema
let consumptionSchema = mongoose.Schema({
  measureId:{
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
  }
});

let Consumption = module.exports = mongoose.model('Consumption', consumptionSchema, 'consumption');
