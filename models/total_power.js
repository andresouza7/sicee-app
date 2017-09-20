let mongoose = require('mongoose');

let totalpowerSchema = mongoose.Schema({
  power:{
    type: Number,
    required: true
  },
  timestamp:{
    type: Date,
    required: true
  },
});

let TotalPower = module.exports = mongoose.model('TotalPower', totalpowerSchema, 'totalpower');
