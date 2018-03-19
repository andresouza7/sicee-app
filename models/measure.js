let mongoose = require('mongoose');

let measureSchema = mongoose.Schema({
  roomId:{
    type: String
  },
  period_start:{
      type: Date,
  },
  period_end:{
    type: Date,
  },
  createdAt:{
  	type: Date,
  },
  consumption_per_day:{type:Array},
  daily_avg:{type:Number,default:0},
  acc_consumption:{type:Number,default:0},
  acc_bill:{type:Number,default:0},
  prediction_consumption:{type:Number,default:0},
  prediction_bill:{type:Number,default:0},
  consumption_per_hour_total:{type:Array},
  consumption_per_hour_device:{type:Array},
  consumption_device:{type:Array},
  consumption_total:{type:Number,default:0},
  cost_for_standard_tariff:{type:Number,default:0},
  cost_for_white_tariff:{type:Number,default:0},
  is_standard_best:{type:Boolean},
  cost_offpeak:{type:Number,default:0},
  cost_intermediate:{type:Number,default:0},
  cost_peak:{type:Number,default:0},
  progress:{type:Number,default:0}
});

let Measure = module.exports = mongoose.model('Measure', measureSchema, 'measures');
