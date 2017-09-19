const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const config = require('../config/database');
const Agenda = require('agenda');

// Telemetry Model
let Telemetry = require('../models/telemetry');
// Consumption Model
let Consumption = require('../models/consumption');
// TotalPower Model
let TotalPower = require('../models/total_power');

// GET LATEST TELEMETRY
router.get('/telemetry',function(req,res){
	Telemetry.find({}).sort({$timestamp:-1}).limit(10).exec(function(err, telemetry_list) {
		res.json(telemetry_list);
		console.log(telemetry_list);
	});
});


// SCHEDULE EVENTS
router.get('/agenda',function(req,res){
	var mongoConnectionString = config.database;
	var agenda = new Agenda({db: {address: mongoConnectionString}});
	// specify collection name to store scheduled tasks --->
	// var agenda = new Agenda({db: {address: mongoConnectionString, collection: 'agenda'}});
	 
	// or override the default collection name: 
	// var agenda = new Agenda({db: {address: mongoConnectionString, collection: 'jobCollectionName'}}); 
	 
	// or pass additional connection options: 
	// var agenda = new Agenda({db: {address: mongoConnectionString, collection: 'jobCollectionName', options: {ssl: true}}}); 
	 
	// or pass in an existing mongodb-native MongoClient instance 
	// var agenda = new Agenda({mongo: myMongoClient}); 
	 
	agenda.define('delete old users', function(job, done) {
	  // User.remove({lastLogIn: { $lt: twoDaysAgo }}, done);
	  console.log('executing task...');
	  done();
	});
	agenda.on('ready', function() {
	  agenda.every('30 seconds', 'delete old users');
	  agenda.start();
	});
	agenda.processEvery('10 seconds');
	res.send(200);
});

router.get('/schedule',function(req,res){
	var mongoConnectionString = config.database;
	var agenda = new Agenda({db: {address: mongoConnectionString}});
	// specify collection name to store scheduled tasks --->
	// var agenda = new Agenda({db: {address: mongoConnectionString, collection: 'agenda'}});
	 
	// or override the default collection name: 
	// var agenda = new Agenda({db: {address: mongoConnectionString, collection: 'jobCollectionName'}}); 
	 
	// or pass additional connection options: 
	// var agenda = new Agenda({db: {address: mongoConnectionString, collection: 'jobCollectionName', options: {ssl: true}}}); 
	 
	// or pass in an existing mongodb-native MongoClient instance 
	// var agenda = new Agenda({mongo: myMongoClient}); 
	 
	agenda.define('delete old users', function(job, done) {
	  // User.remove({lastLogIn: { $lt: twoDaysAgo }}, done);
	  console.log('executing task...');
	  done();
	});
	agenda.on('ready', function() {
	  agenda.every('30 seconds', 'delete old users');
	  agenda.start();
	});
	agenda.processEvery('10 seconds');
	res.send(200);
});

router.get('/agenda/list',function(req,res){
	var mongoConnectionString = config.database;
	var agenda = new Agenda({db: {address: mongoConnectionString}});
	
	agenda.on('ready', function() {
	    agenda.jobs({nextRunAt: {$ne:null}}, function(err, jobs) {
		console.log(jobs[0].attrs.name);
	  // Work with jobs (see below)
		});
	});
	
	res.send(200);
});

// GET TOTAL INSTANTANEOUS POWER
router.get('/totalpower',function(req,res){	
	TotalPower.findOne({}).sort({timestamp:-1}).exec(function(err, totalpower){
		console.log(totalpower);
		if(err){
        	console.log(err);
    	} else {
    		res.json(totalpower);
    	}
	});
});

// GET TOTAL CONSUMPTION WITHIN TIME RANGE
router.get('/totalpowerforperiod', function(req, res){		
	// if (typeof req.query.startAt != 'undefined' || typeof req.query.endAt != 'undefined') {
		TotalPower.find({}).sort({timestamp:-1}).limit(40).exec(function(err, totalpower){
	      if(err){
	        console.log(err);
	      } else {
	      	console.log(totalpower);
	        res.json(totalpower);
	      }
	    });
	// } else {
	// 	res.send('Define start and end date in milliseconds standard, like so: <BR>api/deviceconsumptionforperiod?startAt=1505672394124&endAt=1505672406063');
	// }
});

// GET TOTAL CONSUMPTION
router.get('/totalconsumption', function(req, res){		
	Consumption.aggregate([{$group:{_id:null,total:{$sum:"$consumption"}}}]).exec(function(err, consumption){
      if(err){
        console.log(err);
      } else {
      	console.log(consumption);
        res.json(consumption[0].total);
      }
    });
});

// GET CONSUMPTION FOR EACH DEVICE
router.get('/deviceconsumption', function(req, res){
	Consumption.aggregate([{$group:{_id:"$deviceId",total:{$sum:"$consumption"}}}]).exec(function(err, consumption){
      if(err){
        console.log(err);
      } else {
      	console.log(consumption);
        res.json(consumption);
      }
    });
});

// GET TOTAL CONSUMPTION WITHIN TIME RANGE
router.get('/totalconsumptionforperiod', function(req, res){		
	if (typeof req.query.startAt != 'undefined' || typeof req.query.endAt != 'undefined') {
		Consumption.aggregate([{$match:{timestamp:{$gte:1505672394124,$lte:1505672406063}}},{$group:{_id:null,total:{$sum:"$consumption"}}}]).exec(function(err, consumption){
	      if(err){
	        console.log(err);
	      } else {
	      	console.log(consumption);
	        res.json(consumption[0].total);
	      }
	    });
	} else {
		res.send('Define start and end date in milliseconds standard, like so: <BR>api/deviceconsumptionforperiod?startAt=1505672394124&endAt=1505672406063');
	}
});

// GET CONSUMPTION FOR EACH DEVICE WITHIN TIME RANGE
router.get('/deviceconsumptionforperiod', function(req, res){
		if (typeof req.query.startAt != 'undefined' || typeof req.query.endAt != 'undefined') {
		Consumption.aggregate([{$match:{timestamp:{$gte:1505672394124,$lte:1505672406063}}},{$group:{_id:"$deviceId",total:{$sum:"$consumption"}}}]).exec(function(err, consumption){
	      if(err){
	        console.log(err);
	      } else {
	      	console.log(consumption);
	        res.json(consumption);
	      }
	    });
	} else {
		res.send('Define start and end date in milliseconds standard, like so: <BR>api/deviceconsumptionforperiod?startAt=1505672394124&endAt=1505672406063');
	}
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
	var consumption_list = [];
	
	json_telemetry_data.forEach(function(item){
		let samplingPeriod = 5.0/3600.0; // 5 seconds converted to hour
		let telemetry = new Telemetry();
		let consumption = new Consumption();

		telemetry.deviceId = item.device_id;
		telemetry.power = item.power;
		telemetry.voltage = item.voltage;
		telemetry.current = item.current;
		telemetry.timestamp = Date.now();

		consumption.deviceId = item.device_id;
		consumption.consumption = item.power*samplingPeriod;
		consumption.timestamp = Date.now();
		telemetry_list.push(telemetry);
		consumption_list.push(consumption);

		
	});

	var total_power = 0;
	for (var i=0;i<telemetry_list.length;i++) {
		total_power = total_power + telemetry_list[i].power;
		console.log(total_power)
	}
	let totalpower = new TotalPower();
	totalpower.power = total_power;
	totalpower.timestamp = Date.now();
	totalpower.save(function(err){
    	if(err){
    		console.log('Error saving to db: '+err);
    	}
    });
	
	
    Telemetry.insertMany(telemetry_list,function(err){
    	if(err){
    		console.log(err);
    	} else {
    		res.send('Telemetry uploaded to database ;)\n'+telemetry_list);
    	}
    });

    Telemetry.insertMany(telemetry_list,function(err){
    	if(err){
    		console.log(err);
    	} else {
    		res.send('Telemetry uploaded to database ;)\n'+telemetry_list);
    	}
    });

    Consumption.insertMany(consumption_list,function(err){
    	if(err){
    		console.log(err);
    	} else {
    		// res.send('Telemetry uploaded to database ;)\n'+consumption_list);
    	}
    });

    var request = require('request');
	request.post({
	     url: "http://localhost:8080",
	     headers: {
	        "Content-Type": "application/json"
	     },
	     body: telemetry_list,
	     json:true
	}, function(error, response, body){
	   // console.log(error);
	   // console.log(JSON.stringify(response));
	   // console.log(body);
	});
});

module.exports = router;