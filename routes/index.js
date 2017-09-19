const express = require('express');
const router = express.Router();

// Telemetry Model
let Telemetry = require('../models/telemetry');
// Consumption Model
let Consumption = require('../models/consumption');

router.get('/', function(req, res){
	Consumption.aggregate([{$group:{_id:null,total:{$sum:"$consumption"}}}]).exec(function(err, consumption){
      if(err){
        console.log(err);
      } else {
        res.render('index', {});
      }
    });
});

module.exports = router;