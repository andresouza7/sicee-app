let mongoose = require('mongoose');

let automationSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  data:{
    type: Object,
    required: true
  },
  nextRunAt:{
  	type: Date,
  },
  lastRunAt:{
    type: Date
  }
});

let Automation = module.exports = mongoose.model('Automation', automationSchema, 'agendaJobs');
