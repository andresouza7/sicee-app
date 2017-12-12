const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const config = require('../config/database');
const Agenda = require('agenda');
const request = require('request');
const http = require('http');

// Telemetry Model
let Telemetry = require('../models/telemetry');
// Consumption Model
let Consumption = require('../models/consumption');
// TotalPower Model
let TotalPower = require('../models/total_power');
// Notification Model
let Notification = require('../models/notification');
// Device Model
let Device = require('../models/device');
// RF telemetry Model
let RfTelemetry = require('../models/rftelemetry');

//planned changes referenced as 'implement'
function getLocalDate () {
	let dateUTC = new Date(Date.now()); 
	let offsetMs = dateUTC.getTimezoneOffset()*60000;
	let localDate = new Date(Date.now()-offsetMs);
	return (localDate);
}
function getHourOffset () {
	let dateUTC = new Date(Date.now()); 
	let offsetMs = dateUTC.getTimezoneOffset()*60000;
	let offsetHr = dateUTC.getTimezoneOffset()/60;
	return (offsetHr);
}

function updateState(devId,state) {
	Device.update({deviceId: devId}, {change_state:state}, function(err){
		if(err){
		  console.log(err);
		  return;
		}
	});
}


// RF TELEMETRY get
router.get('/rftelemetry', function(req, res){
	RfTelemetry.findOne({},{_id:0,__v:0}).sort({timestamp:-1}).limit(1).exec(function (err, Data) {
		if ((Date.now()-Data.timestamp) > 2000)
			res.send("rf device is off");
		else
			res.json(Data);
	});
	// res.render('rftelemetry');
	// res.send(200);
  });


  //change get to PUT
// SET DEVICE STATE ON
router.get('/devices/state/update/on/:_id', function(req, res){
	res.sendStatus(200);
	// console.log(req.query.id);
	Device.update({_id: req.params._id}, {change_state:"on"}, function(err){
		if(err){
		  console.log(err);
		  return;
		}
	});
  });

// SET DEVICE STATE OFF
router.get('/devices/state/update/off/:_id', function(req, res){
	res.sendStatus(200);
	// console.log(req.query.id);
	Device.update({_id: req.params._id}, {change_state:"off"}, function(err){
		if(err){
		  console.log(err);
		  return;
		}
	});
  });

// GET DEVICES
router.get('/devices', function(req, res){
	Device.
	  find({}).
	  exec(function(err, devices){
		if(err){
		  console.log(err);
		} else {
		//   console.log(devices);
		  res.json(devices);
		}
	  });
  });

// SMS MESSAGING SERVICE
router.post('/smsAlert',function(req, res){
	var accountSid = 'ACb0e73e47de7ee5b38ae6017ce90d5dff'; // Your Account SID from www.twilio.com/console
	var authToken = 'eeb9b7799954136b89a6a13852badd5f';   // Your Auth Token from www.twilio.com/console

	var twilio = require('twilio');
	var client = new twilio(accountSid, authToken);

	client.messages.create({
	    body: 'sicee alerta',
	    to: '+5596981150386',  // Text this number
	    from: '+12818237943' // From a valid Twilio number
	})
	.then((message) => console.log(message.sid));
	res.send(200);
});

// GET LATEST TELEMETRY
router.get('/telemetry',function(req,res){
	let startAt = new Date(getLocalDate()-10000);
	// console.log(startAt);
	let endAt = getLocalDate();
	// console.log(endAt);
	Telemetry.find({timestamp:{$gte: startAt,$lt: endAt}}).exec(function (err, telemetry) {
		// console.log(telemetry)
		if (err)
			console.log(err);
		res.json(telemetry);
	});
});

// SCHEDULE EVENTS
// TURN ON
router.post('/schedule/on_once',function(req,res){
	console.log(req.body);
	let deviceId = req.body.deviceId;
	let startTime = req.body.startTime;
	var mongoConnectionString = config.database;
	var agenda = new Agenda({db: {address: mongoConnectionString}});
	
	let startJobName = 'Ligar medidor '+deviceId; 
	agenda.define(startJobName, function(job, done) {
	  // User.remove({lastLogIn: { $lt: twoDaysAgo }}, done);
		console.log('Ligando medidor '+deviceId+'...');
		updateState(deviceId,'on');
	  done();
	});
	agenda.on('ready', function() {
	  agenda.schedule(startTime, startJobName);
	  agenda.start();
	});

	agenda.processEvery('10 seconds');
	res.send(200);
});

// TURN OFF
router.post('/schedule/off_once',function(req,res){
	console.log(req.body);
	let deviceId = req.body.deviceId;
	let startTime = req.body.startTime;
	var mongoConnectionString = config.database;
	var agenda = new Agenda({db: {address: mongoConnectionString}});
	
	let startJobName = 'Desligar medidor '+deviceId; 
	agenda.define(startJobName, function(job, done) {
		console.log('Desligando medidor '+deviceId+'...');
		updateState(deviceId,'off');
	  done();
	});
	agenda.on('ready', function() {
	  agenda.schedule(startTime, startJobName);
	  agenda.start();
	});

	agenda.processEvery('10 seconds');
	res.send(200);
});

// TURN ON AND OFF ONCE
router.post('/schedule/on_off_once',function(req,res){
	console.log(req.body);
	let deviceId = req.body.deviceId;
	let startTime = req.body.startTime;
	let endTime = req.body.endTime;
	var mongoConnectionString = config.database;
	var agenda = new Agenda({db: {address: mongoConnectionString}});
	
	let startJobName = 'Ligar medidor '+deviceId; 
	agenda.define(startJobName, function(job, done) {
		console.log('Ligando medidor '+deviceId+'...');
		updateState(deviceId,'on');
	  done();
	});
	agenda.on('ready', function() {
	  agenda.schedule(startTime, startJobName);
	  agenda.start();
	});

	let endJobName = 'Desligar medidor '+deviceId; 
	agenda.define(endJobName, function(job, done) {
		console.log('Desligando medidor '+deviceId+'...');
		updateState(deviceId,'off');
	  done();
	});
	agenda.on('ready', function() {
	  agenda.schedule(endTime, endJobName);
	  agenda.start();
	});

	agenda.processEvery('10 seconds');
	res.send(200);
});

// TURN ON AND OFF AND REPEAT
router.post('/schedule/on_off_repeat',function(req,res){
	console.log(req.body);
	let deviceName = req.body.deviceName;
	let startTime = req.body.startTime;
	let endTime = req.body.endTime;
	let repetition = req.body.repetition;
	var mongoConnectionString = config.database;
	var agenda = new Agenda({db: {address: mongoConnectionString}});
	
	// CODE WORKING FLAWLESSLY
	// agenda.define('TESTjob2', function(job, done) {
	// 	console.log('task running...');
 //   		done();
	// });
	// agenda.on('ready', function () {
	// 	var TESTjob = agenda.create('TESTjob2', {})
	// 	TESTjob.schedule('in 30 seconds').repeatEvery("20 seconds", {timezone: 'America/Chicago'});   
	// 	// TESTjob.fail("Workaround to have a timestamp");
	// 	TESTjob.save();
	// 	agenda.start();
	// });
	
	let startJobName = 'Ligar '+deviceName;
	agenda.define(startJobName, function(job, done) {
		console.log('Ligando'+deviceName+'...');
   		done();
	});
	agenda.on('ready', function () {
		let newJob = agenda.create(startJobName, {})
		newJob.schedule(startTime).repeatEvery(repetition, {timezone: 'America/Chicago'});   
		// newJob.fail("Workaround to have a timestamp");
		newJob.save();
		agenda.start();
	});

	let endJobName = 'Desligar '+deviceName;
	agenda.define(endJobName, function(job, done) {
		console.log('Desligando'+deviceName+'...');
   		done();
	});
	agenda.on('ready', function () {
		let newJob = agenda.create(endJobName, {})
		newJob.schedule(endTime).repeatEvery(repetition, {timezone: 'America/Chicago'});   
		// newJob.fail("Workaround to have a timestamp");
		newJob.save();
		agenda.start();
	});

	agenda.processEvery('10 seconds');
	res.send(200);
});

router.post('/schedule/repeat',function(req,res){
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
	 
	agenda.define('new voltage warning', function(job, done) {
	  // User.remove({lastLogIn: { $lt: twoDaysAgo }}, done);
	  console.log('executing task...');
	  
		request.post({
		     url: "http://localhost:8080",
		     headers: {
		        "Content-Type": "application/json"
		     },
		     body: {text:'text'},
		     json:true
		}, function(error, response, body){
		   // console.log(error);
		   // console.log(JSON.stringify(response));
		   // console.log(body);
		});
	  done();
	});
	agenda.on('ready', function() {
	  agenda.every('20 seconds', 'new voltage warning');
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
		TotalPower.find({}).sort({timestamp:-1}).limit(7).exec(function(err, totalpower){
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
	let datenow = new Date(Date.now());
	var dateBegin = new Date(datenow.getFullYear(),datenow.getMonth(),1);
	var dateEnd = new Date(datenow.getFullYear(),datenow.getMonth()+1,0);		
	// if (typeof req.query.startAt != 'undefined' || typeof req.query.endAt != 'undefined') {
		Consumption.aggregate([{$match:{timestamp:{$gte:dateBegin,$lte:dateEnd}}},{$group:{_id:{$dayOfMonth:"$timestamp"},total:{$sum:"$consumption"}}}]).exec(function(err, consumption){
	      if(err){
	        console.log(err);
	      } else {
	        res.json(consumption);
	      }
	    });
	// } else {
	// 	res.send('Define start and end date in milliseconds standard, like so: <BR>api/deviceconsumptionforperiod?startAt=1505672394124&endAt=1505672406063');
	// }
});

// GET CONSUMPTION FOR EACH DEVICE WITHIN TIME RANGE
router.get('/deviceconsumptionforperiod', function(req, res){
		
	let today = new Date().getDate();
	console.log(getLocalDate());
	console.log(today);
		// if (typeof req.query.startAt != 'undefined' || typeof req.query.endAt != 'undefined') {
		Consumption.aggregate([{$match:{day:11}},{$group:{_id:{$hour:"$timestamp"},total:{$sum:"$consumption"}}}]).exec(function(err, consumption){
	      if(err){
	        console.log(err);
	      } else {
	        res.json(consumption);
	      }
	    });
	// } else {
	// 	res.send('Define start and end date in milliseconds standard, like so: <BR>api/deviceconsumptionforperiod?startAt=1505672394124&endAt=1505672406063');
	// }
});

//use of typeof
// if(typeof deviceId == 'undefined' || typeof power == 'undefined' || typeof voltage == 'undefined' || typeof current == 'undefined')
// GET NOTIFICATIONS FROM DATABASE
router.get('/notifications', function(req, res) {
	Notification.find({}, {_id:0,__v:0}).exec(function(err, notifications) {
		if (err) {
			console.log(err);
			res.send(400);
		} else {
			res.json(notifications);
		}
	});
});

// ========================================================================
// FUNCTIONS BELOW ARE USED BY THE ARDUINO GATEWAY

// GET DEVICE STATE
router.get('/devices/state', function(req, res){
	// with find({})
	let originalQuery = 'this.change_state != this.current_state'; 
	// with aggregate({})
	let alternativeQuery = '[{$match:{$or:[{$and:[{current_state:"off"},{change_state:"on"}]},{$and:[{current_state:"on"},{change_state:"off"}]}]}},{$project:{_id:0,deviceId:1,change_state:1}}]';
	Device.aggregate([{$match:{$or:[{$and:[{current_state:"off"},{change_state:"on"}]},{$and:[{current_state:"on"},{change_state:"off"}]},{ping:1}]}},{$project:{_id:0,pipe:1,change_state:1,ping:1}}]).
	// Device.find("this.change_state != this.current_state").
	exec(function(err, devices){
	  if(err){
			res.sendStatus(500);
			console.log(err);
	  } else {
		if (devices.length>0) 
			console.log(devices);
		res.json(devices);
		devices.forEach(function(device){
			Device.update({pipe: device.pipe}, {current_state:device.change_state}, function(err){
				if(err){
				  console.log(err);
				  return;
				}
			});
		});
	  }
	});
});

router.get('/devices/ping/:pipe',function(req, res){
	console.log(req.params.pipe);
	res.sendStatus(200);
});

// RF TELEMETRY
router.post('/rftelemetry', function(req, res){
	let rftelemetry = new RfTelemetry();
	rftelemetry.pipe = req.body.pipe;
	rftelemetry.ping = req.body.ping;
	rftelemetry.timestamp = Date.now();
	rftelemetry.save(function(err){
		if (err) {
			console.log(err);
			return;
		}
	});
	// console.log(req.body);
	res.sendStatus(200);
});

// VOLTAGE AND CURRENT READINGS
router.post('/telemetry', function(req, res) {
	// console.log(req.body);
	var telemetry_list = [];
	var consumption_list = [];
	
	function checkPipe (callback) {
		req.body.forEach(function(item, index){
			let pipe = item.substring(0, 1); //pay attention the the type string or int
			Device.findOne({pipe: pipe}).exec(function(err, device) { 
				//for each sample uploaded, check if a virtual device is connected to the pipe sending the data
				if (err) {
					console.log(err);
				} else {
					if (device) { // if there is a virtual device paired with this pipe, save to db, otherwise add a new device
						let devId = device._id;
						//data is received from the gateway in an array containing 13-digit strings: 
						//pRvvv.vII.II == pipe(1)+relay_status(2)+voltage(5)+current(5)
						let relayState = parseInt(item.substring(1, 2));
						let vrms = parseFloat(item.substring(2,7));
						let irms = parseFloat(item.substring(7,12));
						let power = vrms*irms;
						// console.log(devId);
						// console.log(vrms);
						// console.log(irms);
						// console.log(power);

						let sampleRateH = 10.0/3600.0; // 10 seconds converted to hour
						let telemetry = new Telemetry();
						let consumption = new Consumption();

						telemetry.deviceId = devId;
						telemetry.power = power;
						telemetry.voltage = vrms;
						telemetry.current = irms;
						telemetry.timestamp = getLocalDate();
						telemetry.month = getLocalDate().getMonth()+1;
						telemetry.day = getLocalDate().getDate();
						telemetry.hour = getLocalDate().getHours()+getHourOffset();
						console.log("timestamp: "+telemetry.timestamp);
						console.log("month: "+telemetry.month);
						console.log("day: "+telemetry.day);
						console.log("hour: "+telemetry.hour);
						
						consumption.deviceId = devId;
						consumption.consumption = power*sampleRateH;
						consumption.timestamp = getLocalDate();
						consumption.month = getLocalDate().getMonth()+1;
						consumption.day = getLocalDate().getDate();
						consumption.hour = getLocalDate().getHours()+getHourOffset();
						telemetry_list.push(telemetry);
						consumption_list.push(consumption);
				
						// SNIPPETS BELOW ARE FILTERS FOR DEVICE STATE CHANGES AND WARNINGS

						// FEEDBACK FROM METER TO UPDATE CURRENT DEVICE STATE
						if (relayState==1) {
							Device.update({pipe: pipe}, {current_state:"on"}, function(err){
								if(err){
									console.log(err);
									return;
								}
							});
						} else if (relayState==0) {
							Device.update({pipe: pipe}, {current_state:"off"}, function(err){
								if(err){
									console.log(err);
									return;
								}
							});
						}
						// DETECT IF VOLTAGE IS 127V OR 220V
						const voltage_max_threshold_127 = 135.0;
						const voltage_min_threshold_127 = 110.0;
						const voltage_max_threshold_220 = 230.0;
						const voltage_min_threshold_220 = 210.0;
						if (vrms < 160) { // voltage is supposed to be 127v
							if (vrms < voltage_min_threshold_127 || vrms > voltage_max_threshold_127) {
								let notification = new Notification();
								notification.nature = 'voltage';
								notification.description = 'A tensão está em '+vrms+' V. Pode haver um problema neste ponto da rede elétrica';
								notification.save(function(err){
									if (err) {
										console.log(err);
										return;
									}
								});
							}
						} else { // voltage is supposed to be 220v
							if (vrms < voltage_min_threshold_220 || vrms > voltage_max_threshold_220) {
								let notification = new Notification();
								notification.nature = 'voltage';
								notification.description = 'A tensão está em '+vrms+' V. Pode haver um problema neste ponto da rede elétrica';
								notification.save(function(err){
									if (err) {
										console.log(err);
										return;
									}
								});
							}
						}
				
						// DETECT IF CURRENT IS TOO HIGH
						const current_max_threshold = 10.0;
						if (irms > current_max_threshold) {
							let notification = new Notification();
							notification.nature = 'current';
							notification.description = 'Valor alto de corrente registrado: '+irms+' A';
							notification.save(function(err){
								if (err) {
									console.log(err);
									return;
								}
							});
						}
						//When telemetry from all devices have been read, proceed with the code
						if (index == req.body.length-1) {
							// console.log("loop:"+req.body.length);
							callback();
						}
					} else {
						Device.findOne({sync: true}).exec(function(err, device) {
							if (device) {
								let id = device._id;
								Device.update({_id: id}, {pipe:pipe}, function(err){
									if(err){
										console.log(err);
										return;
									} else {
										console.log("new device paired with pipe "+pipe);
										Device.update({_id: id}, {sync:false}, function(err){
											if(err){
												console.log(err);
												return;
											}
										});
									}
								});
							} else {
								res.json([]);
								console.log("no devices ready to sync");
							}
						});
					}
				}
			});
		});
	}
	
	//once the asynchronous tasks are done, save the results to the database
	checkPipe(function () {
		var total_power = 0;
		for (var i=0;i<telemetry_list.length;i++) {
			total_power = total_power + telemetry_list[i].power;
			// console.log(total_power)
		}
		let totalpower = new TotalPower();
		totalpower.power = total_power;
		totalpower.timestamp = Date.now();
		totalpower.save(function(err){
			if(err){
				console.log('Error saving to db: '+err);
			}
		});
	
		// SAVE DEVICES TELEMETRY READINGS TO DATABASE
		Telemetry.insertMany(telemetry_list,function(err){
			if(err){
				console.log(err);
			}
		});
	
		// SAVE DEVICES CONSUMPTION DATA TO DATABASE
		Consumption.insertMany(consumption_list,function(err){
			if(err){
				console.log(err);
			}
		});
	
		res.json([]);
		// The response needs to be a JSON because the arduino uses the "[" and "]" symbols
		// as reference to separate the body message from the headers and to close the connection
	});
});

module.exports = router;