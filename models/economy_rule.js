let mongoose = require('mongoose');

// Article Schema
let economy_ruleSchema = mongoose.Schema({
  createdAt:{
    type: Date,
  },
  deviceId: {
    type: String
  },
  timeoff_start:{
      type: Date
  },
  timeoff_end:{
      type: Date
  }
});

let EconomyRule = module.exports = mongoose.model('EconomyRule', economy_ruleSchema, 'economy_rules');
