let mongoose = require('mongoose');

// Article Schema
let deviceSchema = mongoose.Schema({
  deviceId: {
    type: String,
    required: true
  },
  name:{
    type: String,
    required: true
  },
  description:{
    type: String,
    default: "..."
  },
  created_at:{
    type: Date,
    default: Date.now()
  },
  current_state: {
    type: String,
    default: "off"
  },
  change_state: {
    type: String,
    default: "off"
  }
});

let Device = module.exports = mongoose.model('Device', deviceSchema, 'devices');
