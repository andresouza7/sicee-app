const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const config = require('../config/database');
const Agenda = require('agenda');
const request = require('request');
const http = require('http');

// Telemetry Model
var Telemetry = require('../models/telemetry');
// Consumption Model
var Consumption = require('../models/consumption');
// TotalPower Model
var TotalPower = require('../models/total_power');
// Notification Model
var Notification = require('../models/notification');
// Automation Model
var Automation = require('../models/automation');
// Rule Model
var Rule = require('../models/rule');
// Device Model
var Device = require('../models/device');
// Log Model
var Log = require('../models/log');
// RF telemetry Model
var RfTelemetry = require('../models/rftelemetry');
// Log Model
var SysLog = require('../models/syslog');

// ========================= NOTES ON TIME CONVERSION !!! =============================

// All time dependent fields of Telemetry, Consumption and TotalPower Models are converted to local time
// to allow the execution of statistics queries per day and hour on the db, otherwise the samples gathered
// starting at 21h would be considered as part of the next day and the resulting statistics
// queries would return wrong daily and hourly averages. When the client requests data in the UI, the
// API sends a raw json file with the result of MongoDB aggregation pipeline, with all times already
// stored in the local timezone. In the front-end, Angular makes sure timezone offsets are not applied to the data.

// All other time dependent variables are stored in UTC format as there is no need for conversion, even the
// timestamps for automation tasks. In the UI,Angular inserts the timezone offset according to the user timezone.

// ========================= NOTES ON TIME CONVERSION !!! =============================

function getLocalDate () {
	let dateUTC = new Date(Date.now()); 
	let offsetMs = dateUTC.getTimezoneOffset()*60000;
	let offsetHr = dateUTC.getTimezoneOffset()/60;
	let localDate = new Date(Date.now()-offsetMs);
	let timestamp_day_start = new Date(localDate.getFullYear(),localDate.getMonth(),localDate.getDate(),0);
	let timestamp_telemetry = new Date(localDate.getTime()-10000); // timestamp in local timezone
	let year = localDate.getFullYear();
	let month = localDate.getMonth()+1; //this offset will have to be apllied in each API route when retrieving data.
	// getMonth()+1 stores months in the range of 1 to 12, which makes it easier to display data in the UI
	// When getting data from the API, just add the offset to obtain months in the range of 0 to 11, which
	// is the javascript standard.
	let day = localDate.getDate();
	let hour = localDate.getHours()+offsetHr; // prevents the bug of the final 3h of the day being added to the next one
		if (hour >= 24) {
			hour = hour - 24;
			day = day + 1;
		}
	return ({
		timestamp: localDate,
		timestamp_day_start: timestamp_day_start,
		timestamp_telemetry: timestamp_telemetry,
		year: year,
		month: month,
		day: day,
		hour: hour
	});
}

function updateState(devId,state) {
	Device.update({_id: devId}, {change_state:state}, function(err){
		if(err){
		  console.log(err);
		  return;
		}
	});
}

// createAgendaJob serves two route, the automation schedule route and the
// conditional notifications route.
function createAgendaJob (jobName,deviceId,execTime,action) {
	var mongoConnectionString = config.database;
	var agenda = new Agenda({db: {address: mongoConnectionString}});
	
	switch (action){
		case "on":
			agenda.define(jobName, function(job, done) {
				console.log('Ligando medidor '+deviceId+'...');
				updateState(deviceId,'on');
				done();
			});
			break;
		case "off":
			agenda.define(jobName, function(job, done) {
				console.log('Ligando medidor '+deviceId+'...');
				updateState(deviceId,'off');
				done();
			});
			break;
		default:
	}
	agenda.on('ready', function() {
	  agenda.schedule(execTime, jobName);
	  agenda.start();
	});

	agenda.processEvery('10 seconds');
}

// Serves whichever route needs to send an sms notification
function smsAlert (username, phone, msg) {
	// Implement code here to search the database for twilio
	// account information...
	var accountSid = 'ACb0e73e47de7ee5b38ae6017ce90d5dff'; // Your Account SID from www.twilio.com/console
	var authToken = 'eeb9b7799954136b89a6a13852badd5f';   // Your Auth Token from www.twilio.com/console

	var twilio = require('twilio');
	var client = new twilio(accountSid, authToken);

	client.messages.create({
	    body: msg,
	    to: phone,  // Text this number
	    from: '+12818237943' // From a valid Twilio number
	})
	.then((message) => console.log(message.sid));
}

// =========================== HTTP ROUTES ===========================

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
	    body: 'sicee: power off on meter 1',
	    to: '+5596981150386',  // Text this number
	    from: '+12818237943' // From a valid Twilio number
	})
	.then((message) => console.log(message.sid));
	res.send(200);
});

// CHECK SYSTEM CONNECTION
router.get('/checkConnection',function(req,res){
	let startAt = new Date(getLocalDate().timestamp-10000);
	// console.log("start = "+startAt);
	Telemetry.findOne({timestamp:{$gt: startAt}}).exec(function (err, telemetry) {
		// console.log(telemetry);
		if (err)
			console.log(err);
		res.json(telemetry);
	});
});
// GET LATEST TELEMETRY
router.get('/telemetry',function(req,res){
	let startAt = new Date(getLocalDate().timestamp-10000);
	// console.log("start = "+startAt);
	Telemetry.find({timestamp:{$gt: startAt}}).exec(function (err, telemetry) {
		// console.log(telemetry);
		if (err)
			console.log(err);
		res.json(telemetry);
	});
});

router.get('/schedule/search/', function (req,res){
	Automation.find({}).sort({nextRunAt:-1}).limit(10).exec(function(err,list) {
		res.send(list);
	}); 
});
router.delete('/schedule/delete/:_id', function (req,res){
	Automation.remove({_id:req.params._id}, function(err){
        if(err){
          console.log(err);
        }
        res.send('Success');
      });
});

// SCHEDULE EVENTS
router.post('/schedule/',function(req,res){
	let data = req.body;
	console.log(data);
	let startTime = new Date(data.action.on.time);
	let endTime = new Date(data.action.off.time);

	var mongoConnectionString = config.database;
	var agenda = new Agenda({db: {address: mongoConnectionString}});
	
	var smsMsg = "SICEE: "+data.notify.username;
	if (data.devices_list.length > 1)
		smsMsg+=", os equipamentos ";
	else smsMsg+=", o equipamento ";
	data.devices_list.forEach(function (device){
		smsMsg += device.name+", ";
	});

	if (data.action.on.checked) {
		if (data.devices_list.length > 1)
			smsMsg += "foram ligados.";
		else smsMsg+= "foi ligado";
		let jobName = startTime.toISOString();
		agenda.define(jobName, function(job, done) {
			console.log(jobName);
			var jobdata = job.attrs.data;
			jobdata.devices_list.forEach(function (device){
				updateState(device._id,'on');
			});
			smsAlert(data.notify.username, data.notify.phone,smsMsg);
			done();
		});
		agenda.on('ready', function() {
			data.agendaJob = true;
			agenda.schedule(startTime, jobName, data);
			agenda.start();
		});
		agenda.processEvery('10 seconds');
	}
	if (data.action.off.checked) {
		if (data.devices_list.length > 0)
			smsMsg += "foram ligados.";
		else smsMsg+= "foi ligado.";
		let jobName = endTime.toISOString();
		agenda.define(jobName, function(job, done) {
			console.log(jobName);
			var jobdata = job.attrs.data;
			jobdata.devices_list.forEach(function (device){
				updateState(device._id,'off');
			});
			smsAlert(data.notify.username, data.notify.phone,smsMsg);
			done();
		});
		agenda.on('ready', function() {
			data.agendaJob = false;
			agenda.schedule(endTime, jobName, data);
			agenda.start();
		});
		agenda.processEvery('10 seconds');
	}
	
	// OLD CODE, FOR REFECENCE:
	// var mongoConnectionString = config.database;
	// var agenda = new Agenda({db: {address: mongoConnectionString}});
	
	// let startJobName = 'Ligar medidor '+deviceId; 
	// agenda.define(startJobName, function(job, done) {
	//   // User.remove({lastLogIn: { $lt: twoDaysAgo }}, done);
	// 	console.log('Ligando medidor '+deviceId+'...');
	// 	updateState(deviceId,'on');
	//   done();
	// });
	// agenda.on('ready', function() {
	//   agenda.schedule(startTime, startJobName);
	//   agenda.start();
	// });

	// agenda.processEvery('10 seconds');
	res.send(200);
});

// SET NEW RULE
router.post('/setRule/',function(req,res){
	let rule = new Rule();
	rule.devices = req.body.devices
	rule.reference = req.body.params.reference;
	rule.operator = req.body.params.operator;
	rule.threshold = req.body.params.threshold;
	rule.action = req.body.params.action;
	rule.userInfo = req.body.userInfo;
	console.log(rule);
	rule.save(function(err){
		if (err)
			console.log(err);
	});
	res.sendStatus(200);
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

// GET HOURS OF USAGE PER DAY
router.get('/usagePerDay', function(req, res){
	let today = getLocalDate().day;
	Telemetry.aggregate([{$match:{day:today,power:{$gt:0}}},{$group:{_id:"$deviceId",count:{$sum:1}}}]).exec(function(err, consumption){
		if(err){
		console.log(err);
		} else {
			Device.find({},{name:1}).exec(function (err,devices){
				var list = [];
				devices.forEach(function(device){
					consumption.forEach(function (item){
						if (String(item._id) == String(device._id)){
							let object = {
							"id": item._id,
							"usage": item.count*10/3600,
							"name": device.name
							} 
							list.push(object);
						}
					});
				});
				console.log(list);
				res.json(list);
			});
		// res.json(consumption);
		}
	});
});

// GET TOTAL CONSUMPTION WITHIN TIME RANGE
router.get('/consumptionPerDay', function(req, res){
	var startAt = new Date(getLocalDate().year,getLocalDate().month-1,1); // adjust 1-12 to 0-11 month scale
	var endAt = new Date(getLocalDate().year,getLocalDate().month,0); // same as above	
	// query option using $dayOfMonth: _id:{$dayOfMonth:"$timestamp"}
	Consumption.aggregate([{$match:{timestamp:{$gte:startAt,$lte:endAt}}},{$group:{_id:"$day",total:{$sum:"$consumption"}}}]).exec(function(err, consumption){
		if(err){
		console.log(err);
		} else {
		res.json(consumption);
		}
	});
});

// GET HOURLY CONSUMPTION FOR SPECIFIC DAY
router.get('/consumptionPerHour', function(req, res){
	let today = getLocalDate().day;
	console.log("hour "+getLocalDate().hour);
	console.log("day "+today);
	// if (typeof req.query.startAt != 'undefined' || typeof req.query.endAt != 'undefined') {
	Consumption.aggregate([{$match:{day:today}},{$group:{_id:"$hour",total:{$sum:"$consumption"}}}]).exec(function(err, consumption){
		if(err){
		console.log(err);
		} else {
			let consumption_array = [];
			consumption.forEach(function(hour){
				consumption_array.push(hour.total);
			});
			let sum = consumption_array.reduce((previous, current) => current += previous);
			var avg = sum / consumption_array.length;
			let hour_profile = [];
			// consumption.forEach(function(hour){
			// 	let deviation = hour.total - avg;
			// 	if (deviation > 0) {
			// 		let datapoint = {
			// 			hour: hour._id,
			// 			deviation: hour.total
			// 		}
			// 		hour_profile.push(datapoint);
			// 	}
			// });
			console.log(avg);
			const excess = consumption.filter(datapoint => datapoint.total - avg > 0); // datapoint.total - avg = deviation from mean
			res.json({
				consumption: consumption,
				excess: excess});
		}
	});
});

// GET DEVICE CONSUMPTION FOR SPECIFIC RANGE
router.get('/consumptionPerDevice', function(req, res){
	let today = getLocalDate().day;
	// if (typeof req.query.startAt != 'undefined' || typeof req.query.endAt != 'undefined') {
	Consumption.aggregate([{$match:{day:today}},{$group:{_id:"$deviceId",total:{$sum:"$consumption"}}}]).exec(function(err, consumption){
		if(err){
			res.sendStatus(500);
			console.log(err);
		} else {
			console.log(consumption);
			Device.find({},{name:1}).exec(function (err,devices){
				console.log(devices);
				var list = [];
				devices.forEach(function(device){
					// console.log(device.name);
					consumption.forEach(function (item){
						// console.log(item.total);
						if (String(item._id) == String(device._id)){
							let object = {
							"id": item._id,
							"consumption": item.total,
							"name": device.name
							} 
							list.push(object);
						}
					});
				});
				console.log(list);
				res.json(list);
			});
		}
	});
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
	var telemetry_list = []; // Receives each device's telemetry data
	var consumption_list = []; // either
	
	function checkPipe (callback) {
		req.body.forEach(function(item, index){
			var pipe = item.substring(0, 1); // This needs to be a string rather than an Int because in the front-end
											 // Javascript interprets a 0 int as false and will say the device is not paired
											 // even if it's connected to pipe 0
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

						let sampleRateInHours = 10.0/3600.0; // 10 seconds converted to hour
						let telemetry = new Telemetry();
						let consumption = new Consumption();

						telemetry.radioconn = true;
						telemetry.deviceId = devId;
						telemetry.deviceName = device.name;
						telemetry.power = power;
						telemetry.voltage = vrms;
						telemetry.current = irms;
						telemetry.timestamp = getLocalDate().timestamp;
						telemetry.month = getLocalDate().month;
						telemetry.day = getLocalDate().day;
						telemetry.hour = getLocalDate().hour;
						console.log("telemetry received at "+telemetry.timestamp);
						// console.log("month: "+telemetry.month);
						// console.log("day: "+telemetry.day);
						// console.log("hour: "+telemetry.hour);
						
						consumption.deviceId = devId;
						consumption.consumption = power*sampleRateInHours;
						consumption.timestamp = getLocalDate().timestamp;
						consumption.month = getLocalDate().month;
						consumption.day = getLocalDate().day;
						consumption.hour = getLocalDate().hour;
						telemetry_list.push(telemetry);
						consumption_list.push(consumption);

						// Updates the telemetry field of the devices sending data. This will indicate
						// which devices are connected and which are not
						Device.update({_id: device._id},{telemetry: telemetry}).exec(function(err, res){
							if (err)
								log(err);
						});

						// FEEDBACK FROM SICEE METER BOARD TO UPDATE CURRENT RELAY STATE
						// This keeps tasks in memory. So if a command fails to execute,
						// the server will keep sending it until it does.
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

						// ==========================================================
						// RULES DEFINED BY THE USER FOR AUTOMATION AND NOTIFICATIONS
						// *** START ***

						// CURRENT FILTER
						Rule.find({reference:"current"}).exec(function (err, rules){
							rules.forEach(function (rule){
								rule.devices.forEach(function (device){
									if (telemetry.deviceId == device._id) {
										if (telemetry.current > rule.threshold) {
											if (rule.action.notify_checked) {
												notify = true;
											}
											if (rule.action.on_checked){
												updateState(device._id,"on");
											}
											if (rule.action.off_checked){
												updateState(device._id,"off");
											}
											console.log("current rule detected for device: "+device.name);
										}
									}
								});
							});
						});

						
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

						// RULES DEFINED BY THE USER FOR AUTOMATION AND NOTIFICATIONS
						// *** END ***
						// ==========================================================
					
						// When telemetry from all devices have been read, execute the code that
						// depend from the asynchronous result.
						if (index == req.body.length-1) {
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
								console.log("no pipe matches and no devices ready to sync");
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
	});
	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	// EEEEEEEEEEEEEEEXXXTREMELY IMPORTANT
	// The server needs send a JSON response because the arduino uses the "[" and "]" symbols
	// as reference to identify where the response starts and ends, if doesnt find these symbols
	// it wont close the current connection and so the next request will fail and telemetry
	// data will be lost.
	res.json([]);
});

// LOGS MANAGEMENT
router.post('/log',function(req,res){
	let newlog = new Log();
	newlog.event = req.body.event;
	newlog.timestamp = new Date();
	newlog.save(function(err){
		if (err) log(err);
	})
	console.log(req.body);
	res.sendStatus(200);
});
router.get('/log',function(req,res){
	Log.find({timestamp:{$gte:getLocalDate().timestamp_day_start}},function(err, response){
		res.send(response);
		if (err){console.log(err);}
	});
});
router.get('/log/checkSystemStatus/off',function(req,res){
	let timenow = new Date();
	Log.findOne({event:"Gateway desconectado",timestamp:{$lte:timenow}}).sort({timestamp:-1}).exec(function(err, response){
		res.send(response);
		if (err){console.log(err);}
	});
});
router.get('/log/checkSystemStatus/on',function(req,res){
	let timenow = new Date();
	Log.findOne({event:"Gateway conectado",timestamp:{$lte:timenow}}).sort({timestamp:-1}).exec(function(err, response){
		res.send(response);
		if (err){console.log(err);}
	});
});

router.get('/systemstats',function(req,res){
	Telemetry.aggregate([{$match:{day:getLocalDate().day}},{$group:{_id:"$deviceId",count:{$sum:1}}}]).exec(function (err, device_stats){
		SysLog.find({shutdown:true,timestamp:{$gte:getLocalDate().timestamp_day_start}}).count().exec(function (err, system_logs){
			let startAt = new Date(getLocalDate().year, getLocalDate().month-1, getLocalDate().day,-3); // starts at 00:00 => 2018-01-18T00:00:00.000Z
			// console.log(getLocalDate().timestamp.getTime() - startAt.getTime());
			let samples_cap = (((getLocalDate().timestamp.getTime() - startAt.getTime()) /1000)/10).toFixed(); // number of samples that were supposed to be colected so far considering a 10s sampling period
			let most_samples = 0; // some devices may have less samples than others due to RF packet loss, so
			// in order to know the total gateway online time its necessary to know which one got the mots samples
			device_stats.forEach(function(device, index){
				device.lost = samples_cap - device.count;
				if (device.count > most_samples)
					most_samples = device.count;
			});
			let online_time = (most_samples * 10 / 3600);
			Device.find({},{name:1}).exec(function (err,devices){
				var list = [];
				devices.forEach(function(device){
					device_stats.forEach(function (item){
						if (String(item._id) == String(device._id)){
							item.name = device.name;
						}
					});
				});
				let system_stats = {
					stats: device_stats,
					shutdowns: system_logs,
					online_time: online_time
				}
				res.send(system_stats);
			});
		});
	});
});

// LOOK FOR SYSTEM SHUTDOWN...
function log (state) {
	let syslog = new SysLog();
	if (state)
		syslog.shutdown = true;
	else syslog.shutdown = false;
	syslog.timestamp = getLocalDate().timestamp;
	syslog.save(function(err){
		if (err) console.log(err);
	});
}
setInterval(function(){ 
	// console.log("looking for status");
	let startAt = getLocalDate().timestamp_telemetry;
	// console.log(startAt);
	Device.findOne({"telemetry.timestamp":{$gt:startAt}}).exec(function(err,response){
		if (response){ // got telemetry sample, means the system is online
			SysLog.findOne({}).sort({timestamp:-1}).exec(function(err, res){
				if (res){
					if (res.shutdown == true){ // if the last log says it's offline, create a system log saying it's online now
						log(false);
						let newlog = new Log(); // also log it to the daily events logs so the user can see
						newlog.event = "Gateway conectado";
						newlog.timestamp = new Date(); // user logs use standard UTC time since theyr just for displaying stuff
						newlog.save(function (err){
							if (err) {console.log(err);}
						});
					}
				}
			});
		}
		if (!response){ // no telemetry means the system is offline
			console.log("system offline");
			SysLog.findOne({}).sort({timestamp:-1}).exec(function(err,res){
				// console.log(res);
				if (res){
					if (res.shutdown == false) { // shutdown false means the system was back online and then went down again
						Device.findOne({"telemetry.timestamp":{$gt:getLocalDate().timestamp_telemetry}}).sort({timestamp:-1}).exec(function(err,response2){
							if (!response2) {
								log(true);
								let newlog = new Log(); // also log it to the daily events logs so the user can see
								newlog.event = "Gateway desconectado";
								newlog.timestamp = new Date(); // user logs use standard UTC time since theyr just for displaying stuff
								newlog.save(function (err){
									if (err) {console.log(err);}
								});
							}
						});
					}
				} else {log(true);} // if there are no logs withing 30s, register a new one saying it's offline
			});
		}
	});
}, 20000);

router.delete('/hardreset',function(req, res){
	Telemetry.deleteMany({},function(err,response){});
	Notification.deleteMany({},function(err,response){});
	TotalPower.deleteMany({},function(err,response){});
	Automation.deleteMany({},function(err,response){});
	Rule.deleteMany({},function(err,response){});
	Device.deleteMany({},function(err,response){});
	Log.deleteMany({},function(err,response){});
	RfTelemetry.deleteMany({},function(err,response){});
	Consumption.deleteMany({},function(err,response){});
	SysLog.deleteMany({},function(err,response){});
	res.send("The system has been cleaned!");
});

module.exports = router;