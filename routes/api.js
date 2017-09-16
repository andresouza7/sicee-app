const express = require('express');
const router = express.Router();

// Telemetry Model
let Telemetry = require('../models/telemetry');

// Add route for get request
router.get('/telemetry',function(req,res){
	Telemetry.find({}, function(err, telemetry_list) {
		res.render('telemetry',{telemetry_list:telemetry_list});
	}).limit(10);
	
});

// Add Route for post request
router.post('/telemetry', function(req, res){
// === UPDATE DB USING QUERY PARAMETERS ===
	// let deviceId = req.query.deviceId;
	// let power = req.query.power;
	// let voltage = req.query.voltage;
	// let current = req.query.current;
	// if(typeof deviceId == 'undefined' || typeof power == 'undefined' || typeof voltage == 'undefined' || typeof current == 'undefined')
 //    	res.send('parameter undefined, please provide deviceId/power/voltage/current'); 
 //    else {
 //    	let telemetry = new Telemetry();
 //    	telemetry.deviceId = deviceId;
 //    	telemetry.power = power;
 //    	telemetry.voltage = voltage;
 //    	telemetry.current = current;
 //    	telemetry.timestamp = Date.now();

 //    	telemetry.save(function(err){
	//       if(err){
	//         console.log(err);
	//         return;
	//       } else {
	//         req.flash('success','Article Added');
	//         res.send(200);
	//       }
	//     });	
 //    }
 
	// === UPDATE DB USING JSON ===
	// let data = JSON.parse('{"name":"andre"}');
	let json_telemetry_data = req.body;
	var telemetry_list = [];
	json_telemetry_data.forEach(function(item){
		let telemetry = new Telemetry();
		telemetry.deviceId = item.device_id;
		telemetry.power = item.power;
		telemetry.voltage = item.voltage;
		telemetry.current = item.current;
		telemetry.timestamp = Date.now();
		telemetry_list.push(telemetry);
	});

	
    Telemetry.insertMany(telemetry_list,function(err){
    	if(err){
    		console.log(err);
    	} else {
    		res.send('Telemetry uploaded to database ;)\n'+telemetry_list);
    	}
    });

});

module.exports = router;