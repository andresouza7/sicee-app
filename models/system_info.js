let mongoose = require('mongoose');

// Article Schema
let system_infoSchema = mongoose.Schema({
  _id: {
    type: String,
    default: "system_info"
  },
  standard_tariff:{
    type: Number
  },
  offpeak_tariff:{
    type: Number
  },
  intermediate_tariff:{
    type: Number
  },
  peak_tariff:{
    type: Number
  },
  peak_period:{
    type: {
      start: Date,
      end: Date
    }
  },
  gateway_connected:{
    type: Boolean
  }
});

let SystemInfo = module.exports = mongoose.model('SystemInfo', system_infoSchema, 'system_info');
