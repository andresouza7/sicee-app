const express = require('express');
const router = express.Router();

// Telemetry Model
let Telemetry = require('../models/telemetry');

// Add route for get request
router.get('/',function(req,res){
	Telemetry.find({}).sort({$timestamp:1}).limit(10).exec(function(err, telemetry_list) {
		res.render('telemetry',{telemetry_list:telemetry_list});
		console.log(telemetry_list);
	});
});

module.exports = router;