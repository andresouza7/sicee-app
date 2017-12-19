let mongoose = require('mongoose');

let syslogSchema = mongoose.Schema({
  shutdown: {
    type: Boolean,
    required: true
  },
  timestamp:{
    type: Date,
    required: true
  }
});

let SysLog = module.exports = mongoose.model('SysLog', syslogSchema, 'syslogs');
