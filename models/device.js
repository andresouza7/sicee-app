let mongoose = require('mongoose');

// Article Schema
let deviceSchema = mongoose.Schema({
  name:{
    type: String,
    required: true
  },
  current_state: {
    type: String,
    default: "off"
  },
  change_state: {
    type: String,
    default: "off"
  },
  pipe: {
    type: String,
    default:""
  },
  sync: {
    type:Boolean,
    default:false
  }
});

let Device = module.exports = mongoose.model('Device', deviceSchema, 'devices');
