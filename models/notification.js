let mongoose = require('mongoose');

let notificationSchema = mongoose.Schema({
  nature:{
    type: String,
    required: true
  },
  description:{
  	type: String,
  	required: true
  },
  timestamp:{
    type: Date,
    default: Date.now()
  },
  solved:{
  	type: Boolean,
  	default: false
  }
});

let Notification = module.exports = mongoose.model('Notification', notificationSchema, 'notifications');
