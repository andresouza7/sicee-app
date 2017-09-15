let mongoose = require('mongoose');

// Article Schema
let deviceSchema = mongoose.Schema({
  name:{
    type: String,
    required: true
  },
  description:{
    type: String,
    required: true
  },
  created_at:{
    type: String,
    required: true
  }
});

let Device = module.exports = mongoose.model('Device', deviceSchema);
