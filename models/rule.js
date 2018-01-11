let mongoose = require('mongoose');

// Article Schema
let ruleSchema = mongoose.Schema({
  reference:{
    type: String,
  },
  time: {
    type: Object
  },
  operator:{
      type: String
  },
  devices:{
      type: Array
  },
  threshold:{
      type: Number
  },
  action: {
      type: Object
  },
  userInfo: {
      type: Object
  }
});

let Rule = module.exports = mongoose.model('Rule', ruleSchema, 'rules');
