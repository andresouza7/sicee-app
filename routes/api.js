const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const config = require('../config/database');
const Agenda = require('agenda');
const request = require('request');
const http = require('http');
const app = require('../app');

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
// Economy rule Model
var EconomyRule = require('../models/economy_rule');
// Room Model
var Room = require('../models/room');
// Measure Model
var Measure = require('../models/measure');
// Bring in SystemInfo Model
let SystemInfo = require('../models/system_info');
// Bring in User Model
let User = require('../models/user');

// Socket io Config
var io = app.io;

app.post('/', function(req, res){
  console.log(req.body);
  io.emit('notification', JSON.stringify(req.body));
  res.send(200);
});
router.get('/socket', function(req, res){
	console.log(req.body);
	if (req.body) {
		io.emit('telemetry', "enviando dados");
		res.sendStatus(200);
	}

	// listen to data
	// io.on('connection', function(socket){
	// 	// console.log('a user connected');
	// 	socket.on('notification', function(msg){
	// 	  console.log('msg: '+msg);
	// 	  io.emit('notification', msg);
	// 	});
	// });
});

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

function getLocalDate (inputDate) {
	var dateUTC = new Date(Date.now()); 
	var offsetMs = dateUTC.getTimezoneOffset()*60000;
	var offsetHr = dateUTC.getTimezoneOffset()/60;
	var localDate = new Date(Date.now()-offsetMs);
	if (inputDate){
		inputDate.setTime( inputDate.getTime() - inputDate.getTimezoneOffset()*60*1000 ); 
		return (inputDate);
	} else {
		let timestamp_day_start = new Date(localDate.getFullYear(),localDate.getMonth(),localDate.getDate(),0);
		let timestamp_telemetry = new Date(localDate.getTime()-10000); // time now minus 10 seconds
		let year = localDate.getFullYear();
		let month = localDate.getMonth()+1; //this offset will have to be apllied in each API route when retrieving data.
		// getMonth()+1 stores months in the range of 1 to 12, which makes it easier to display data in the UI
		// When getting data from the API, just add the offset to obtain months in the range of 0 to 11, which
		// is the javascript standard.
		let day = localDate.getDate();
		let hour = localDate.getHours()+offsetHr; // prevents the last 3h of the day from being added to the next one
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

function getNameById (id) {
	return Device.findOne({_id: id},{name:1}).exec(function (err,response){
		return response;
	});
}
function getRoomNameById (id) {
	return Room.findOne({_id: id},{name:1}).exec(function (err,response){
		return response;
	});
}

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
						io.emit('connectionStatus', "on");
						let newlog = new Log(); // also log it to the daily events logs so the user can see
						newlog.event = "Gateway conectado";
						newlog.timestamp = new Date(); // user logs use standard UTC time since theyr just for displaying stuff
						// newlog.save(function (err){
						// 	if (err) {console.log(err);}
						// });
					}
				}
			});
		}
		if (!response){ // no telemetry means the system is offline
			// console.log("system offline");
			SysLog.findOne({}).sort({timestamp:-1}).exec(function(err,res){
				// console.log(res);
				if (res){
					if (res.shutdown == false) { // shutdown false means the system was back online and then went down again
						Device.findOne({"telemetry.timestamp":{$gt:getLocalDate().timestamp_telemetry}}).sort({timestamp:-1}).exec(function(err,response2){
							if (!response2) {
								log(true);
								io.emit('connectionStatus', "off");
								let newlog = new Log(); // also log it to the daily events logs so the user can see
								newlog.event = "Gateway desconectado";
								newlog.timestamp = new Date(); // user logs use standard UTC time since theyr just for displaying stuff
								// newlog.save(function (err){
								// 	if (err) {console.log(err);}
								// });
							}
						});
					}
				} else {log(true);} // if there are no logs withing 30s, register a new one saying it's offline
			});
		}
	});
}, 10000);

// =========================== HTTP ROUTES ===========================
//MEASURES START
router.post('/room/measure', function(req, res){
	let data = req.body;
	let measure = new Measure();
	measure.roomId = data.roomId;
	measure.period_start = new Date(data.period_start);
	measure.period_end = new Date(data.period_end);
	measure.createdAt = new Date();
	measure.save(function(err){
		if (err) console.log(err);
	});
	Room.update({_id: data.roomId},{$addToSet: {measures: String(measure._id) }}).exec(function (err){
		if (err) console.log(err);
	});
	res.sendStatus(200);
});
router.get('/measure', function(req, res){
	Measure.find({},function(err,measures){
		res.json(measures);
	});
});
router.post('/room/measure/delete', function(req, res){
	let data = req.body;
	console.log(data);
	Measure.remove({_id: data.measureId}).exec(function(err){
		if (err) console.log(err);
	})
	Room.update({_id: data.roomId},{$pull: {measures: data.measureId }}).exec(function (err){
		if (err) console.log(err);
	});
	Telemetry.remove({measureId: data.measureId}).exec(function(err){
		if (err) console.log(err);
	});
	res.sendStatus(200);
});
//MEASURES END

// consumption for room
router.get('/room/consumption', function(req, res){
	Room.find({}).exec(function(err, rooms){
		var promises = [];
		function promise(room){
			return new Promise (function (resolve, reject){
				// Sums total consumption for all the devices in the room
				let start = new Date(getLocalDate().year,getLocalDate().month-1,1);
				let end = new Date(getLocalDate().year,getLocalDate().month,0);
				let match = {$match:{roomId:String(room._id),deviceId:{$in: room.devices},timestamp:{$gte:start,$lt:end}}};
				let group = {$group:{_id:"$day",total:{$sum:"$consumption"}}};
				Consumption.aggregate([match,group]).exec(function(err, consumption){
					return resolve({
						room: room.name,
						consumption: consumption,
						period: {
							start: start,
							end: end
						}
					});
				});
			}); // promise return
		} // promise function
		rooms.forEach(function(room){
			promises.push(promise(room));
		}); // room loop
		Promise.all(promises).then(function(data){
			res.json(data);
		});
	}); // main db search
	// res.sendStatus(200);
});

// ===== ROOMS MANAG. START =====
router.post('/room', function(req, res){
	let data = req.body;
	let room = new Room();
	if (typeof data.devices != 'undefined')
		room.devices = data.devices;
	room.name = data.name;
	room.createdAt = new Date();
	room.save(function (err){
		if (err) console.log(err);
	})
	res.sendStatus(200);
});
router.get('/room', function(req, res){
	Room.find({},function(err,rooms){
		var promises = [];
		function promise(room) {
			return new Promise (function (resolve, reject){
				var nested_promises = [];
				function nestedPromise(deviceId){
					return new Promise(function(resolve, reject){
						Device.findById(deviceId).exec(function(err, dev){
							// console.log("name: "+dev.name);
							return resolve({name: dev.name, _id: dev._id});
						})

					});
				}
				room.devices.forEach(function(deviceId){
					nested_promises.push(nestedPromise(deviceId));
				});
				Promise.all(nested_promises).then(function(nestedData){
					// console.log(nestedData);
					function promiseMeasure (measureId) {
						console.log("measure id "+measureId);
						return new Promise (function (resolve,reject){
							Measure.findById(measureId,{
								roomId: 1,
								createdAt: 1,
								period_start: 1,
								period_end: 1
							}).exec(function (err, measure){
								console.log("measure "+measure);
								return resolve(measure);
							});
						});
					}
					var promises_measures = [];
					room.measures.forEach(function(measureId){
						promises_measures.push(promiseMeasure(measureId));
					});
					Promise.all(promises_measures).then(function(measures_data){
						return resolve({
							_id: room._id,
							createdAt: room.createdAt,
							name: room.name,
							measures: measures_data,
							devices: nestedData
						});
					});
					
				});
			});
		}
		rooms.forEach(function(room){
			promises.push(promise(room));
		});
		Promise.all(promises).then(function(data){
			// console.log(data);
			res.json(data);
		});
		// res.json(rooms);
	});
});
router.put('/room/:id', function(req, res){
	console.log(req.body);
	let data = req.body;
	if (data.name) {
		Room.update({_id:req.params.id},{name:data.name}).exec(function(err,rooms){
		});
	}
	res.sendStatus(200);
});
router.delete('/room/:id', function(req, res){
	Room.findByIdAndRemove(req.params.id).exec(function(err){
	});
	Measure.remove({roomId: req.params.id}).exec(function(err){
	});
	Device.update({roomId: req.params.id},{roomId: null}).exec(function(err){
	});
	res.sendStatus(200);
});
router.post('/room/removeDevice', function(req, res){ // NEEDS TO UPDATE BOTH ROOM AND DEVICE COLLECTIONS
	console.log(req.body);
	let data = req.body;
	Room.update({_id: data.room_id},{ $pull: { devices: data.device_id } }).exec(function(err,rooms){
	});
	Device.update({_id: data.device_id},{roomId: null}).exec(function(err,response){
	});
	res.sendStatus(200);
});
router.post('/room/addDevice', function(req, res){
	console.log(req.body);
	let data = req.body;
	Room.update({_id: data.room_id},{ $addToSet: { devices: data.device_id  } }).exec(function(err){
	});
	Device.update({_id: data.device_id},{roomId: data.room_id}).exec(function(err){
	});
	res.sendStatus(200);
});
// ===== ROOMS END =====\

// ===== ECONOMY RULE START =====
router.post('/economy_rule', function(req, res){ // ADD RULE
	let data = req.body;
	console.log(data);
	let rule = new EconomyRule();
	rule.createdAt = new Date();
	rule.deviceId = data.deviceId;
	rule.timeoff_start = new Date(data.start);
	rule.timeoff_end = new Date(data.end);
	rule.save(function (err){
		res.sendStatus(200);
		if (err) {
			res.sendStatus(500);
			console.log(err);
		}
	});
});
router.delete('/economy_rule/:id', function(req, res){ // DELETE RULE BY ID
	EconomyRule.findByIdAndRemove(req.params.id, function(err){
		if (err) console.log(err);
		res.sendStatus(200);
	});
});

router.get('/economy_rule', function(req, res){ // GET ALL RULES FOR EACH DEVICE
	// let today = getLocalDate().day;
	// let start = getLocalDate(new Date(getLocalDate().year,getLocalDate().month-1,today,0));
	// let end = getLocalDate(new Date(getLocalDate().year,getLocalDate().month-1,today,24));
	Device.find({},{telemetry:0}).exec(function(err, devices){
		var promises = [];
		function processPromise (device) {
			return new Promise(function (resolve,reject){
				var datenow = new Date();
				var ts_query = new Date(datenow.getFullYear(), datenow.getMonth(),1);

				Telemetry.aggregate([{$match:{deviceId: String(device._id), power:{$gt:10},timestamp:{$gte:ts_query}}},{$group:{_id:"$deviceId",mean_power:{$avg:"$power"}}}]).exec(function(err,response){
					if (err) res.sendStatus(500);
					else {
						var device_total_economy = 0;
						var device_total_projected_economy = 0;
						var device_mean_power = 0;

						var nestedPromises = [];
						EconomyRule.find({deviceId: device._id}).exec(function(err, rules){
							function processNested(rule){
								return new Promise (function (resolveNested,rejectNested){
									var createdAt = rule.createdAt.getDate();
									var start_time = rule.timeoff_start.getTime();
									var end_time = rule.timeoff_end.getTime();
									var daily_hours = (end_time - start_time)/(3600*1000);
									var elapsed_days = new Date().getDate() - createdAt;
									var endOfMonth = new Date(datenow.getFullYear(), datenow.getMonth(),0).getDate();
									let mean_power = response.length ? response[0].mean_power : 0; // it is sure that there will only be one object in return
									device_mean_power = mean_power;
									let consumption_reduction = elapsed_days*daily_hours*mean_power/1000; // total in hours * mean power of device (kWh)
									device_total_economy += consumption_reduction;
									device_total_projected_economy += (endOfMonth-createdAt)*daily_hours*mean_power/1000;
									let object = {
										_id: rule._id,
										deviceName: device.name,
										mean_power: mean_power,
										daily_hours: daily_hours,
										// start_time: rule.timeoff_start.getHours() + rule.timeoff_start.getMinutes()/60,
										// end_time: rule.timeoff_end.getHours() + rule.timeoff_end.getMinutes()/60,
										start_time: rule.timeoff_start,
										end_time: rule.timeoff_end,
										projected_reduction: (endOfMonth-createdAt)*daily_hours*mean_power/1000,
										consumption_reduction: consumption_reduction,
										days_elapsed: new Date().getDate() - createdAt,
										days_left: endOfMonth - new Date().getDate()
									};
									if (!err)
										return resolveNested(object);
									else
										return rejectNested({err : err});
								});
							}
							rules.forEach(function(rule){
								nestedPromises.push(processNested(rule));
							});
							Promise.all(nestedPromises).then(function(nestedData){
								// console.log(nestedData);
								if (nestedData) {
								return resolve({
									device: device.name,
									total_economy: device_total_economy,
									projected_economy: device_total_projected_economy,
									mean_power: device_mean_power,
									rules: nestedData});
								} else {
									return reject({err: "error"});
								}
							});
						});
					}
				});
			}); // promise inner body
		} // promise function
		
		devices.forEach(function(device){
			promises.push(processPromise(device));
		});
		Promise.all(promises).then(function(data){
			// console.log(data);
			res.json(data);
		});
	});
	// res.sendStatus(200);
});

router.get('/economy_rule/:id', function(req, res){ // Get rule by ID
	var devId = req.params.id;
	var promises = [];
	EconomyRule.findOne({deviceId: devId}, function (err, response) {
		var createdAt = response.createdAt.getDate();
		var start_time = response.timeoff_start.getTime(); console.log(start_time);
		var end_time = response.timeoff_end.getTime(); console.log(end_time);
		var daily_hours = (end_time - start_time)/(3600*1000);
		var elapsed_days = new Date().getDate() - createdAt; console.log("elapsed days "+elapsed_days);
		var datenow = new Date();
		var endOfMonth = new Date(datenow.getFullYear(), datenow.getMonth(),0).getDate();
		var ts_query = new Date(datenow.getFullYear(), datenow.getMonth(),1); console.log(ts_query);
		// This will find the equipment mean power considering the consumption in the current month
		Telemetry.aggregate([{$match:{deviceId: devId, power:{$gt:1},timestamp:{$gte:ts_query}}},{$group:{_id:"$deviceId",mean_power:{$avg:"$power"}}}]).exec(function(err,response){
			if (err) res.sendStatus(500);
			else {
				console.log(response);
				let mean_power = response[0].mean_power; // it is sure that there will only be one object in return
				let consumption_reduction = elapsed_days*daily_hours*mean_power/1000; // total in hours * mean power of device (kWh)
				getNameById(devId).then(function(device){
					res.json({
						deviceName: device.name,
						mean_power: mean_power,
						daily_hours: daily_hours,
						projected_reduction: (endOfMonth-createdAt)*daily_hours*mean_power/1000,
						consumption_reduction: consumption_reduction,
						days_elapsed: new Date().getDate() - createdAt,
						days_left: endOfMonth - new Date().getDate()
					});
				});
			}
		});
	});
});
// ===== ECONOMY RULE END =====

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

// ===== UPDATE DEVICE STATE START =====
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
// ===== UPDATE DEVICE STATE END =====

// GET DEVICES
router.get('/devices', function(req, res){
	Device.
	  find({}).
	  exec(function(err, devices){
		if(err){
		  console.log(err);
		} else {
			var promises = [];
			function promise(device){
				return new Promise (function (resolve,reject){
					Room.find({_id: device.roomId}).exec(function(err, room){
						if (room.length > 0) {
							// console.log(device);
							let new_data = {
								_id: device._id,
								name: device.name,
								roomId: device.roomId,
								telemetry: device.telemetry,
								sync: device.sync,
								pipe: device.pipe,
								change_state: device.change_state,
								current_state: device.current_state,
								roomName: room[0].name
							};
							if (err) reject(err);
							else resolve(new_data);
						} else {
							resolve(device);
						}
					});
				});
			}
			devices.forEach(function(device){
				promises.push(promise(device))
			})
			Promise.all(promises).then(function(data){
				// console.log(data);
				res.json(data);
			})
			// console.log(devices);
		  	
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

// ===== SCHEDULE TASKS START =====
router.get('/schedule/search/', function (req,res){
	Automation.find({}).sort({nextRunAt:-1}).limit(10).exec(function(err,list) { // Get all schedules
		res.json(list);
	}); 
});
router.delete('/schedule/delete/:_id', function (req,res){ // Delete schedule by id
	Automation.remove({_id:req.params._id}, function(err){
        if(err){
          console.log(err);
        }
        res.send('Success');
      });
});

router.post('/schedule/',function(req,res){ // Add new schedule
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
	res.sendStatus(200);
});
// ===== SCHEDULE TASKS END =====

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

// ===== STATISTICS START =====
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
	let start = getLocalDate(new Date(getLocalDate().year,getLocalDate().month-1,today,0));
	let end = getLocalDate(new Date(getLocalDate().year,getLocalDate().month-1,today,24)); 
	Telemetry.aggregate([{$match:{day:today,timestamp:{$gte:start,$lt:end},power:{$gt:0}}},{$group:{_id:"$deviceId",count:{$sum:1}}}]).exec(function(err, consumption){
		if(err){
		console.log(err);
		} else {
			var promises = [];
			consumption.forEach(function(item, index){
				promises.push(matchId(item));
			});
			Promise.all(promises).then(function(data){ // once all promises are done, send the list
				res.json(data);
			});
			function matchId(item){
				return new Promise(function(resolve,reject){ // each async search returns a new promise
					getNameById(item._id).then(function(device){
						let object = {
						"id": item._id, // or device._id
						"usage": item.count*10/3600, 
						"name": device.name
						} 
						return resolve(object);
					}, function(error){
						return reject(error);
					});
				});
			}
		}
	});
});

// GET TOTAL CONSUMPTION WITHIN TIME RANGE
router.get('/consumptionPerDay', function(req, res){
	// console.log(req.body);
	var startAt, endAt;
	if (req.query.year && req.query.month && req.query.month > 0){
		startAt = new Date(req.query.year,req.query.month-1,1); // adjust 1-12 to 0-11 month scale
		endAt = new Date(req.query.year,req.query.month,0); // same as above
	} else {
		startAt = new Date(getLocalDate().year,getLocalDate().month-1,1); // adjust 1-12 to 0-11 month scale
		endAt = new Date(getLocalDate().year,getLocalDate().month,0); // same as above
	}
	// query option using $dayOfMonth: _id:{$dayOfMonth:"$timestamp"}
	Consumption.aggregate([{$match:{timestamp:{$gte:startAt,$lte:endAt}}},{$group:{_id:"$day",total:{$sum:"$consumption"}}}]).exec(function(err, consumption){
		if(err){
		console.log(err);
		} else {
		res.json(consumption);
		}
	});
});

// GET HOURLY CONSUMPTION FOR MONTH
router.get('/consumptionPerHourMonthly', function(req, res){
	console.log(req.query);
	var start,end;
	if (req.query.year && req.query.month && req.query.month > 0){
		start = new Date(req.query.year,req.query.month-1,1); // adjust 1-12 to 0-11 month scale
		end = new Date(req.query.year,req.query.month,0); // same as above
	} else {
		start = new Date(getLocalDate().year,getLocalDate().month-1,1); console.log("start "+start);
		end = new Date(getLocalDate().year,getLocalDate().month,0); console.log("end "+end);
	}
	// if (typeof req.query.startAt != 'undefined' || typeof req.query.endAt != 'undefined') {
	Consumption.aggregate([{$match:{timestamp:{$gte:start,$lte:end}}},{$group:{_id:"$hour",total:{$sum:"$consumption"}}}]).exec(function(err, consumption){
		if(err){
		console.log(err);
		} else {
			if (consumption.length > 0) {
				let consumption_standard = [];
				let consumption_peak = [];
				let consumption_intermediate = [];
				let consumption_offpeak = [];
				consumption.forEach(function(hour){
					consumption_standard.push(hour.total);
					if (hour._id < 18 || hour._id >= 23) { // peak Period
						consumption_offpeak.push(hour.total);
						// console.log("offpeak hour: "+hour._id);
					}
					if ((hour._id >= 18 && hour._id < 19) || (hour._id >= 22 && hour._id < 23)) { // intermediate Period
						consumption_intermediate.push(hour.total);
						// console.log("intermediate hour: "+hour._id);
					}
					if (hour._id >= 19 && hour._id < 22) { // offpeak Period
						consumption_peak.push(hour.total);
						// console.log("peak hour: "+hour._id);
					}
				});
				var standard,peak,intermediate,offpeak,standard_best;
				if (consumption_standard.length > 0) consumption_standard.reduce((previous, current) => current += previous)*0.4/1000;
				if (consumption_peak.length > 0) consumption_peak.reduce((previous, current) => current += previous)*0.4*1.82/1000;
				if (consumption_intermediate.length > 0) consumption_intermediate.reduce((previous, current) => current += previous)*0.4*1.15/1000;
				if (consumption_offpeak.length > 0) consumption_offpeak.reduce((previous, current) => current += previous)*0.4*0.78/1000;
				if (peak && intermediate && offpeak) (peak+intermediate+offpeak) < standard ? false : true;
				
				var promises = [];
				function promise(device) {
					return new Promise(function (resolve,reject){
						Consumption.aggregate([{$match:{deviceId: String(device._id),timestamp:{$gte:start,$lte:end}}},{$group:{_id:"$hour",total:{$sum:"$consumption"}}}]).exec(function(err, device_consumption){
							let data = {
								device: device.name,
								consumption: device_consumption
							};
							return resolve(data);
						});
					});
				}
				Device.find({}).exec(function(err,devices){
					devices.forEach(function(device){
						promises.push(promise(device));
					});
					Promise.all(promises).then(function(data){
						res.json({
							general: consumption,
							devices: data,
							bill_stats:{
								standard: standard,
								white: peak+intermediate+offpeak,
								peak: peak,
								intermediate: intermediate,
								offpeak: offpeak,
								standard_best: standard_best
							}
						});
					});
				});
			}
		}
	});
});

// GET HOURLY CONSUMPTION FOR SPECIFIC DAY
router.get('/consumptionPerHour', function(req, res){ // retrieve by timezone working
	let today = getLocalDate().day; 
	// console.log("day "+today);
	let start = getLocalDate(new Date(getLocalDate().year,getLocalDate().month-1,today,0));
	// console.log("start "+start.toISOString());
	let end = getLocalDate(new Date(getLocalDate().year,getLocalDate().month-1,today,24)); 
	// console.log("end "+end.toISOString());
	// if (typeof req.query.startAt != 'undefined' || typeof req.query.endAt != 'undefined') {
	Consumption.aggregate([{$match:{timestamp:{$gte:start,$lt:end}}},{$group:{_id:"$hour",total:{$sum:"$consumption"}}}]).exec(function(err, consumption){
		console.log(consumption);
		if(err){
		console.log(err);
		} else {
			if (consumption.length > 0) {
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
				// console.log(avg);
				const excess = consumption.filter(datapoint => datapoint.total - avg > 0); // datapoint.total - avg = deviation from mean
				res.json({
					consumption: consumption,
					excess: excess});
			}
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
			// console.log(consumption);
			Device.find({},{name:1}).exec(function (err,devices){
				// console.log(devices);
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
				// console.log(list);
				res.json(list);
			});
		}
	});
});
// ===== STATISTICS END =====

// YEARS AND MONTHS FOR SELECT BOX
router.get('/getRange', function(req, res){ // Lets the user know the range of telemetry available
	Consumption.aggregate([{$group:{_id:{$year:"$timestamp"},total:{$sum:0}}}]).exec(function(err, years_list){
		var promises = [];
		function promise (year) {
			return new Promise(function (resolve,reject){
				var start = new Date(year._id,0,1); 
				// console.log("start "+start);
				var end = new Date(year._id,12,0);
				// console.log("end "+end); // last month = 11, last day = 0 
				Consumption.aggregate([{$match:{timestamp:{$gte: start, $lte: end}}},{$group:{_id:{$month:"$timestamp"},total:{$sum:1}}}]).exec(function(err, months_list){
					var months = [];
					months_list.forEach(function(item){
						var days_list = [];
						for (var day=1;day<=end.getDate();day++){
							days_list.push({
								day: day
							});
						}
						months.push({
							month: item._id,
							days: days_list
						});
					});
					return resolve ({
						year: year._id,
						months: months,
					});
				});
			}, function (error){
				return reject (error);
			});
		}
		years_list.forEach(function(year){
			promises.push(promise(year));
		});
		Promise.all(promises).then(function(data){
			// console.log(data);
			res.json(data);
		});
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

router.get('/rules', function(req,res){
	Rule.find({time:{$exists:true}}).exec(function (err, response){
		res.send(response);
		console.log(response);
	});
});

router.delete('/hardreset',function(req, res){ // RESET ALL DATA
	Telemetry.deleteMany({},function(err,response){});
	Notification.deleteMany({},function(err,response){});
	TotalPower.deleteMany({},function(err,response){});
	Automation.deleteMany({},function(err,response){});
	Rule.deleteMany({},function(err,response){});
	Device.deleteMany({},function(err,response){});
	Log.deleteMany({},function(err,response){});
	RfTelemetry.deleteMany({},function(err,response){});
	SysLog.deleteMany({},function(err,response){});
	EconomyRule.deleteMany({},function(err,response){});
	Measure.deleteMany({},function(err,response){});
	User.deleteMany({},function(err,response){});
	res.send("The system has been cleaned!");
});

// CHECK SYSTEM CONNECTION
router.get('/checkConnection', function(req, res){
	SysLog.findOne({}).sort({timestamp:-1}).exec(function(err, log){
		if (log){
			res.json(log);
		}
	});
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

router.get('/systemstats',function(req,res){
	// let today = getLocalDate().day;
	// let start = getLocalDate(new Date(getLocalDate().year,getLocalDate().month-1,today,0));
	// let end = getLocalDate(new Date(getLocalDate().year,getLocalDate().month-1,today,24));
	// Telemetry.aggregate([{$match:{day:today,timestamp:{$gte:start,$lt:end}}},{$group:{_id:"$deviceId",count:{$sum:1}}}]).exec(function (err, device_stats){
	// 	SysLog.find({shutdown:true,timestamp:{$gte:getLocalDate().timestamp_day_start}}).count().exec(function (err, system_logs){
	// 		let startAt = new Date(getLocalDate().year, getLocalDate().month-1, getLocalDate().day,-3); // starts at 00:00 => 2018-01-18T00:00:00.000Z
	// 		// console.log(getLocalDate().timestamp.getTime() - startAt.getTime());
	// 		let samples_cap = (((getLocalDate().timestamp.getTime() - startAt.getTime()) /1000)/10).toFixed(); // number of samples that were supposed to be colected so far considering a 10s sampling period
	// 		let most_samples = 0; // some devices may have less samples than others due to RF packet loss, so
	// 		// in order to know the total gateway online time its necessary to know which one got the mots samples
	// 		device_stats.forEach(function(device, index){
	// 			device.lost = samples_cap - device.count;
	// 			if (device.count > most_samples)
	// 				most_samples = device.count;
	// 		});
	// 		let online_time = (most_samples * 10 / 3600);
	// 		Device.find({},{name:1}).exec(function (err,devices){
	// 			var list = [];
	// 			devices.forEach(function(device){
	// 				device_stats.forEach(function (item){
	// 					if (String(item._id) == String(device._id)){
	// 						item.name = device.name;
	// 					}
	// 				});
	// 			});
	// 			let system_stats = {
	// 				stats: device_stats,
	// 				shutdowns: system_logs,
	// 				online_time: online_time
	// 			}
	// 			res.send(system_stats);
	// 		});
	// 	});
	// });
	res.sendStatus(200);
});

// ========================================================================
// FUNCTIONS BELOW ARE USED BY THE ARDUINO GATEWAY

// GET DEVICE STATE
router.get('/devices/state', function(req, res){
	io.emit('connectionStatus', "on");
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
router.post('/telemetryOriginal', function(req, res) {
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
						if (device.roomId)
						{
							let devId = device._id;
							//data is received from the gateway in an array containing 13-digit strings: 
							//pRvvv.vII.II == pipe(1)+relay_status(2)+voltage(5)+current(5)
							let relayState = parseInt(item.substring(1, 2));
							let vrms = parseFloat(item.substring(2,7))*2;
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
							telemetry.roomId = device.roomId;
							telemetry.power = power;
							telemetry.voltage = vrms;
							telemetry.current = irms;
							telemetry.timestamp = getLocalDate().timestamp;
							telemetry.month = getLocalDate().month;
							telemetry.day = getLocalDate().day;
							telemetry.hour = getLocalDate().hour;
							console.log("telemetry for "+telemetry.deviceName+" at "+telemetry.timestamp);
							
							consumption.deviceId = devId;
							consumption.roomId = device.roomId;
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

							// it takes 20 to 30s for the feedback on the relay state change to arrive
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

							Rule.find({"action.off_checked":true,"time.start_time":{$lte:new Date()},"time.end_time":{$gte:new Date()}},function(err, rules) {
								// console.log(new Date());
								rules.forEach(function(rule){
									rule.devices.forEach(function(device, index){
										if (device._id == telemetry.deviceId) {
											if (relayState == 1) { //relayState = 1 is the board feedback saying its on
												updateState(device._id,"off");
												// console.log("equipamento proibido de funcionar este horario");
												let newlog = new Log();
												newlog.event = "usuario "+rule.userInfo.username+" tentou ligar equipamento "+device.name;
												newlog.timestamp = new Date();
												newlog.save(function(err, response){
													if (err) console.log(err);
												});
											}
										}
									});
								});
							});

							// LOOKS FOR ECONOMY RULES DEFINED FOR EACH DEVICE
							EconomyRule.find({deviceId: devId}).exec(function (err, rules){
								if (rules) {
									rules.forEach(function(rule){
										var timenow = new Date().getHours() + new Date().getMinutes()/60;
										var start = rule.timeoff_start.getHours() + rule.timeoff_start.getMinutes()/60;
										var end = rule.timeoff_end.getHours() + rule.timeoff_end.getMinutes()/60;
										// console.log("timenow"+timenow);
										// console.log("start"+start);
										// console.log("end"+end);
										if (timenow >= start && timenow < end && relayState == 1) {
											updateState(rule.deviceId,"off");
											console.log("device cannot be on at this time");
										}
									});
								}
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
							console.log("Add device "+device.name+" to a room");
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
		function insertTelemetry() {
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
		} // end function insert telemetry

		let now = new Date(); // in UTC
		let match_query = {$and:[{'measures.period_start':{$lte:now}},{'measures.period_end':{$gte:now}}]};
		Room.aggregate([
			// Get just the docs that contain a shapes element where color is 'red'
			{$match: match_query},
			{$project: {
				measures: {$filter: {
					input: '$measures',
					as: 'measure',
					cond: [{$and:[{ $lte: [ "$$measure.period_start", now ] },{ $gte: [ "$$measure.period_end", now ] }]}]
				}
			},measure_exists: {$filter: {
				input: '$measures',
				as: 'measure',
				cond: [{$or:[{ $gt: [ "$$measure.period_start", now ] },{ $lt: [ "$$measure.period_end", now ] }]},false,true]
				}
			},
				_id: 0
			}}
		]).exec(function(err,response){
			if (response.length) {
				// insert telemetry
				insertTelemetry();
				console.log(response);
				// when telemetry done, updateEach measure calculations
			} else {console.log("no measures programmed for now");}
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
	io.emit('telemetry', "telemetry received");
	res.json([]); // returns the response immediately
});

router.post('/telemetry',function(req,res){
	io.emit('telemetry', "telemetry received"); // Let front-end knows there is new telemetry
	console.log('Telemetry taken at '+new Date());
	res.json([]); // send response to board

	var samples = req.body;
	console.log(samples);
	// 1. First, check if the boards are linked to a virtual device
	if (samples) {
		samples.forEach(function(sample, index){
			// Parse received string to actual variables
			let pipe = sample.substring(0, 1); // Treated as a String. Int will return error
			let relayState = parseInt(sample.substring(1, 2));
			let vrms = parseFloat(sample.substring(2,7))*2;
			let irms = parseFloat(sample.substring(7,12));
			let power = vrms*irms;
			// console.log("sample"+sample);
			Device.findOne({pipe: pipe}).exec(function(err,device){ // There is a device match for this pipe
				if (device){
					// Update device telemetry to indicate the radio link is connected
					Device.findByIdAndUpdate(device._id, {telemetry: {
						voltage: vrms,
						current: irms,
						power: power,
						timestamp: getLocalDate().timestamp
					}}).exec(function (err){
						if (err) console.log(err);
					});

					// FEEDBACK FROM SICEE METER BOARD TO UPDATE CURRENT RELAY STATE
					// This keeps tasks in memory. So if a command fails to execute
					// it will be tried again
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
					// save samples if there is a measurement programmed
					saveSamples(device._id, sample);
				} else { // Pairs a new device to this pipe
					Device.findOne({sync: true}).exec(function(err, device) {
						if (device) {
							let id = device._id;
							Device.update({_id: id}, {pipe:pipe}, function(err){
								if(err) {console.log(err); return;
								} else {
									console.log("new device paired with pipe "+pipe);
									Device.update({_id: id}, {sync:false}, function(err){
										if(err) {console.log(err); return;}
									});
								}
							});
						} else {
							console.log("no pipe matches and no devices ready to sync");
						}
					});
				}
			});
		});
	}

	// 2. For each device linked, check if it 
	function saveSamples(deviceId, sample) {
		Room.findOne({devices: String(deviceId)}).exec(function(err, room){
			// console.log("room "+room.name);
			if (room && room.measures.length){
				room.measures.forEach(function(measureId){
					// console.log(measureId);
					let now = new Date();
					Measure.findOne({_id:measureId,period_start:{$lte:now},period_end:{$gte:now}},{_id:1})
					.exec(function(err, measure){
						if (err) console.log(err);
						if (measure) {
							// console.log("measure meets criteria");
							let vrms = parseFloat(sample.substring(2,7))*2;
							let irms = parseFloat(sample.substring(7,12));
							let power = vrms*irms;
							let telemetry = new Telemetry();
							telemetry.measureId = measureId;
							telemetry.deviceId = deviceId;
							telemetry.power = power;
							telemetry.voltage = vrms;
							telemetry.current = irms;
							let sampleRateInHours = 10/3600; // 10 seconds converted to hour
							telemetry.consumption = power*sampleRateInHours;
							telemetry.timestamp = getLocalDate().timestamp;
							telemetry.save(function(err){ 
								if (err) console.log(err);
								// Also update statistics base on the new data
								updateStats(measureId, deviceId, room);
							});

							// Updates the telemetry field of the device sending data. This will indicate
							// which devices are connected and which are not
							Device.update({_id: deviceId},{telemetry: telemetry}).exec(function(err, res){
								if (err)
									log(err);
							});
						}
					});
				})
			}
		});

		function updateStats (measureId, deviceId, room) {
			// get tariff values from database
			var getSystemInfo = function () {
				return SystemInfo.findById("system_info").exec(function(err,system_info){
					return (system_info);
				});
			}

			// Consumption total
			Telemetry.aggregate([
				{$match:{measureId: measureId}},
				{$group:{_id:"all",value:{$sum:"$consumption"}}}
			]).exec(function(err, consumption){
				Measure.findByIdAndUpdate(measureId,{
					consumption_total: consumption[0].value
				},function(err){ if (err) console.log(err) });
			});
			// Consumption per device
			Telemetry.aggregate([
				{$match:{measureId: measureId}},
				{$group:{_id:"$deviceId",value:{$sum:"$consumption"}}}
			]).exec(function(err, consumption){
				Measure.findByIdAndUpdate(measureId,{
					consumption_device: consumption
				},function(err){ if (err) console.log(err) });
			});
			// Consumption per hour and consumer profile
			getSystemInfo().then(function(system_info){
				var standard_tariff,peak_tariff,intermediate_tariff,offpeak_tariff;
				if (!system_info) {
					standard_tariff = 0.4;
					peak_tariff = 1.82*standard_tariff;
					intermediate_tariff = 1.15*standard_tariff;
					offpeak_tariff = 0.78*standard_tariff;
				}
				Telemetry.aggregate([
					{$match:{measureId: measureId}},
					{$group:{_id:{$hour:"$timestamp"},value:{$sum:"$consumption"}}}
				]).exec(function(err, consumption){
					// consumer profile stats calculation
					let consumption_standard = [];
					let consumption_peak = [];
					let consumption_intermediate = [];
					let consumption_offpeak = [];
					consumption.forEach(function(hour){
						consumption_standard.push(hour.value);
						if (hour._id < 18 || hour._id >= 23) { // peak Period
							consumption_offpeak.push(hour.value);
							// console.log("offpeak hour: "+hour._id);
						}
						if ((hour._id >= 18 && hour._id < 19) || (hour._id >= 22 && hour._id < 23)) { // intermediate Period
							consumption_intermediate.push(hour.value);
							// console.log("intermediate hour: "+hour._id);
						}
						if (hour._id >= 19 && hour._id < 22) { // offpeak Period
							consumption_peak.push(hour.value);
							// console.log("peak hour: "+hour._id);
						}
					});
					var standard=0,peak=0,intermediate=0,offpeak=0,standard_best;
					if (consumption_standard.length > 0) standard = consumption_standard.reduce((previous, current) => current += previous)*system_info.standard_tariff/1000;
					if (consumption_peak.length > 0) peak = consumption_peak.reduce((previous, current) => current += previous)*system_info.peak_tariff/1000;
					if (consumption_intermediate.length > 0) intermediate = consumption_intermediate.reduce((previous, current) => current += previous)*system_info.intermediate_tariff/1000;
					if (consumption_offpeak.length > 0) offpeak = consumption_offpeak.reduce((previous, current) => current += previous)*system_info.offpeak_tariff/1000;
					if (peak && intermediate && offpeak) standard_best = (peak+intermediate+offpeak) < standard ? false : true;
	
					Measure.findByIdAndUpdate(measureId,{
						consumption_per_hour_total: consumption,
						cost_for_standard_tariff: standard,
						cost_for_white_tariff: offpeak+intermediate+peak,
						cost_offpeak: offpeak,
						cost_intermediate: intermediate,
						cost_peak: peak,
						is_standard_best: standard_best
					},function(err){ if (err) console.log(err) });
				});
			});
			
			// Consumption per hour for each device
			function promise(deviceId) {
				return new Promise (function(resolve, reject){
					Telemetry.aggregate([
						{$match:{measureId: measureId, deviceId: deviceId}},
						{$group:{_id:{$hour:"$timestamp"},value:{$sum:"$consumption"}}}
					]).exec(function(err, consumption){
						return resolve ({deviceId: deviceId, consumption: consumption});
					});
				});
			}
			promises_consumption_per_hour_device = [];
			if (room.devices.length){
				room.devices.forEach(function(deviceId){
					promises_consumption_per_hour_device.push(promise(deviceId));
				});
			}
			Promise.all(promises_consumption_per_hour_device).then(function(data){
				Measure.findByIdAndUpdate(measureId,{
					consumption_per_hour_device: data
				},function(err){ if (err) console.log(err) });
			});

			// Total consumption per day of the month
			Telemetry.aggregate([
				{$match:{measureId: measureId}},
				{$group:{_id:{$dayOfMonth:"$timestamp"},value:{$sum:"$consumption"}}}
			]).exec(function(err, consumption){
				Measure.findByIdAndUpdate(measureId,{
					consumption_per_day: consumption
				},function (err) {
					if (err) console.log(err);
				});
			});
			
			// Update measure progress
			Measure.findOne({_id:measureId},{period_start:1,period_end:1}).exec(function(err, measure){
				// console.log(measure);
				let start = measure.period_start.getTime();
				let finish = measure.period_end.getTime();
				let now = new Date();
				if (now >= start && now <= finish) {
					let progress = ((now - start) / (finish - start))*100;
					Measure.findByIdAndUpdate(measureId,{progress: progress.toFixed(1)}).exec(function(err){
						if (err)  console.log(err);
					});
				}
			});
			// END STATS UPDATES
		}
	}
});

router.post('/telemetryBranch',function(req,res){
	io.emit('telemetry', "telemetry received");
	res.json([]);

	// console.log(req.body);
	let now = new Date(); // in UTC
	let match_query = {$and:[{'measures.period_start':{$lte:now}},{'measures.period_end':{$gte:now}}]};
	Room.aggregate([
		// Get just the docs that contain a shapes element where color is 'red'
		{$match: match_query},
		{$project: {
			measures: {$filter: {
				input: '$measures',
				as: 'measure',
				cond: {$and:[{ $lte: [ "$$measure.period_start", now ] },{ $gte: [ "$$measure.period_end", now ] }]}
			}},
			devices: "$devices"
		}}
	]).exec(function(err,rooms){
		rooms.forEach(function(room){
			room.measures.forEach(function(measure){
				var telemetry_list = [];
				var consumption_list = [];

				function promise(sample){
					return new Promise (function(resolve, reject) {
						var pipe = sample.substring(0, 1);
						Device.findOne({pipe: pipe}).exec(function(err,device){
							if (device) {
								console.log("device match found");
								let vrms = parseFloat(sample.substring(2,7))*2;
								let irms = parseFloat(sample.substring(7,12));
								let power = vrms*irms;
								let telemetry = {
									deviceId : device._id,
									relayState : parseInt(sample.substring(1, 2)),
									vrms : vrms,
									irms : irms,
									power : power,
									timestamp : getLocalDate().timestamp
								}
								let sampleRateInHours = 10.0/3600.0; // 10 seconds converted to hour
								let consumption = {
									deviceId : device._id,
									consumption : power*sampleRateInHours,
									timestamp : getLocalDate().timestamp
								}
								Room.update(
									{ "_id": room._id, "measures._id": measure._id},
									{ "$push": 
										{"measures.$.telemetry":telemetry}
									}
								).exec(function(err,response){});
								Room.update(
									{ "_id": room._id, "measures._id": measure._id},
									{ "$push": 
										{"measures.$.consumption":consumption}
									}
								).exec(function(err,response){});
								telemetry_list.push(telemetry);
								consumption_list.push(consumption);
								return resolve ();
							} else {
								console.log("device match NOT found");
								Device.findOne({sync: true}).exec(function(err, device_search_two) {
									if (device_search_two) {
										let id = device_search_two._id;
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
								return resolve ();
							}
						}); // where device search ended
					});
				}
				
				var promises = [];
				if (req.body.length) {// incoming data from board
					req.body.forEach(function(sample){ 
						promises.push(promise(sample));
					});
					Promise.all(promises).then(function(data){
						// After samples were inserted in the DB, update stats
						calculateStats(measure._id);
					});
				}
			});
		});
	});
});

function calculateStats (measureId) {
	function updateMeasure(measureId, new_stat) {
		Room.update({'measures._id':measureId},{ $set: new_stat 
		}).exec(function(err, response){
			if (err) console.log(err);
		});
	}

	// write code later to get from database
	var standard_tariff = 0.4;
	var peak_tariff = 1.82*standard_tariff;
	var intermediate_tariff = 1.15*standard_tariff;
	var offpeak_tariff = 0.78*standard_tariff;
	// OBS: "sum" is the variable for total consumption


	// GET CONSUMPTION PER DEVICE
	var promise1 = new Promise(function(resolve,reject){
		Room.aggregate([
		{$match:{"measures._id":measureId}},
		{$project: {
			measure: {$filter: {
				input: '$measures',
				as: 'measure',
				cond: {$eq: ['$$measure._id', measureId]}
			}},
			_id: 0
		}},
		{$unwind:'$measure'},
		{$project: {consumption: '$measure.consumption'}},
		{$unwind:"$consumption"},
		{$group:{_id:"$consumption.deviceId",sum:{$sum:"$consumption.consumption"}}}
		]).exec(function(err,response){
			// console.log(response);
			// updateMeasure(measureId,{
			// 	"statistics.field" : {consumption_device: response}
			// });
			resolve(response);
		});
	});

	// GET TOTAL CONSUMPTION
	var promise2 = new Promise(function(resolve,reject){
		Room.aggregate([
		{$match:{"measures._id":measureId}},
		{$project: {
			measure: {$filter: {
				input: '$measures',
				as: 'measure',
				cond: {$eq: ['$$measure._id', measureId]}
			}},
			_id: 0
		}},
		{$unwind:'$measure'},
		{$project: {consumption: '$measure.consumption'}},
		{$unwind:"$consumption"},
		{$group:{_id:'all',sum:{$sum:"$consumption.consumption"}}}
		]).exec(function(err,response){
			// console.log(response);
			// updateMeasure(measureId,{
			// 	"statistics.consumption_total" : response
			// });
			// updateMeasure(measureId,{
			// 	"statistics.estimated_cost_so_far" : response
			// });
			resolve(response);
		});
	});

	// GET TOTAL CONSUMPTION PER HOUR and PROFILE
	var promise3 = new Promise(function(resolve,reject){
	Room.aggregate([
		{$match:{"measures._id":measureId}},
		{$project: {
			measure: {$filter: {
				input: '$measures',
				as: 'measure',
				cond: {$eq: ['$$measure._id', measureId]}
			}},
			_id: 0
		}},
		{$unwind:'$measure'},
		{$project: {consumption: '$measure.consumption'}},
		{$unwind:"$consumption"},
		{$group:{_id:{$hour:"$consumption.timestamp"},sum:{$sum:"$consumption.consumption"}}}
		]).exec(function(err,response){
			// updateMeasure(measureId,{
			// 	"statistics.consumption_per_hour_total" : response
			// });
			// get profile analysis
			let consumption_standard = [];
			let consumption_peak = [];
			let consumption_intermediate = [];
			let consumption_offpeak = [];
			response.forEach(function(hour){
				consumption_standard.push(hour.sum);
				if (hour._id < 18 || hour._id >= 23) { // peak Period
					consumption_offpeak.push(hour.sum);
					// console.log("offpeak hour: "+hour._id);
				}
				if ((hour._id >= 18 && hour._id < 19) || (hour._id >= 22 && hour._id < 23)) { // intermediate Period
					consumption_intermediate.push(hour.sum);
					// console.log("intermediate hour: "+hour._id);
				}
				if (hour._id >= 19 && hour._id < 22) { // offpeak Period
					consumption_peak.push(hour.sum);
					// console.log("peak hour: "+hour._id);
				}
			});
			var standard,peak,intermediate,offpeak,standard_best;
			if (consumption_standard.length > 0) standard = consumption_standard.reduce((previous, current) => current += previous)*standard_tariff/1000;
			if (consumption_peak.length > 0) peak = consumption_peak.reduce((previous, current) => current += previous)*peak_tariff/1000;
			if (consumption_intermediate.length > 0) intermediate = consumption_intermediate.reduce((previous, current) => current += previous)*intermediate_tariff/1000;
			if (consumption_offpeak.length > 0) offpeak = consumption_offpeak.reduce((previous, current) => current += previous)*offpeak_tariff/1000;
			if (peak && intermediate && offpeak) standard_best = (peak+intermediate+offpeak) < standard ? false : true;

			// updateMeasure(measureId,{
			// 	"statistics.profile_analysys" : {
			// 		cost_for_standard_tariff: standard,
			// 		cost_for_white_tariff: peak+intermediate+offpeak,
			// 		is_standard_best: standard_best,
			// 		cost_offpeak: offpeak,
			// 		cost_intermediate: intermediate,
			// 		cost_peak: peak
			// 	}
			// });
			resolve({
					cost_for_standard_tariff: standard,
					cost_for_white_tariff: peak+intermediate+offpeak,
					is_standard_best: standard_best,
					cost_offpeak: offpeak,
					cost_intermediate: intermediate,
					cost_peak: peak
			});
		});
	});

	// GET TOTAL CONSUMPTION PER HOUR PER DEVICE
	var promise4 = new Promise (function(resolve,reject){
		Room.findOne({'measures._id':measureId},{devices:1}).exec(function(err,room){
			if (room){
				function promise(deviceId){
					return new Promise(function(resolve,reject){
						Room.aggregate([
							{$match:{"measures._id":measureId}},
							{$project: {
								measure: {$filter: {
									input: '$measures',
									as: 'measure',
									cond: {$eq: ['$$measure._id', measureId]}
								}},
								_id: 0
							}},
							{$unwind:'$measure'},
							{$project: {consumption: '$measure.consumption'}},
							{$unwind:"$consumption"},
							{$match:{'consumption.deviceId': mongoose.Types.ObjectId(deviceId)}},
							{$group:{_id:{$hour:"$consumption.timestamp"},sum:{$sum:"$consumption.consumption"}}}
							]).exec(function(err,response){
								// do stuff with device results
								resolve({deviceId: deviceId, consumption: response});
						});
					});
				}
				var promises = [];
				room.devices.forEach(function(deviceId){
					promises.push(promise(deviceId));
				});
				Promise.all(promises).then(function(data){
					// console.log(data);
					// updateMeasure(measureId,{
					// 	"statistics.consumption_per_hour_device" : data
					// });
					resolve(data);
				});
			}
		});
	});

	Promise.all([promise1,promise2,promise3,promise4]).then(function(data){
		// console.log("promises "+JSON.stringify(data));
		updateMeasure(measureId,{
			"statistics" : {stats:{
				field1: data[0],
				field2: data[1],
				field3: data[2],
				field4: data[3]
				}
			}
		});
	});

	// UPDATE MEASURE PROGRESS
	Room.aggregate([
		{$match:{"measures._id":measureId}},
		{$project: {
			measure: {$filter: {
				input: '$measures',
				as: 'measure',
				cond: [{$eq: ['$$measure._id', measureId]}]
			}},
			_id: 0
		}},
		{$unwind:'$measure'},
		{$project: {_id:'$measure._id',period_start: '$measure.period_start',period_end: '$measure.period_end'}},
    	{$match:{"_id":"5a5a7168aed78a80f2a1fda5"}}
	]).exec(function(err, measure){
		// console.log(measure._id);
		// let start = measure.period_start.getTime();
		// let finish = measure.period_end.getTime();
		// let now = new Date();
		// let progress = 0;
		// if (now > start && now < finish) {
		// 	progress = ((now - start) / (finish - start))*100;
		// }
		// if ( now > finish) {
		// 	progress = 100
		// }
		// console.log(progress);
		// updateMeasure(measureId,{
		// 	"statistics.progress" : progress.toFixed(0)
		// });
	});
}

router.get('/stats/:id',function(req,res){
	Measure.findById(req.params.id).exec(function(err,measure){
		Room.findById(measure.roomId,{name:1}).exec(function(err, room){ // get room name
			function promise_consumption_per_hour(item) {
				return new Promise (function (resolve, reject){
					Device.findById(item.deviceId,{name:1}).exec(function(err, device){
						return resolve({deviceName: device.name, consumption: item.consumption});
					});
				});
			}
			var promises_consumption_per_hour = []; // device consumption per hour during period (array)
			measure.consumption_per_hour_device.forEach(function(item){
				promises_consumption_per_hour.push(promise_consumption_per_hour(item));
			});
			Promise.all(promises_consumption_per_hour).then(function (consumption_per_hour_device){
				// step 1 complete
				function promise_consumption_total (item){
					return new Promise (function (resolve, reject){
						Device.findById(item._id,{name:1}).exec(function(err, device){
							return resolve({deviceName: device.name, value: item.value});
						});
					});
				}
				var promises_consumption_total = []; // total consumption per device during period (number)
				measure.consumption_device.forEach(function(item){
					promises_consumption_total.push(promise_consumption_total(item));
				})
				Promise.all(promises_consumption_total).then(function(consumption_device){
					// step 2 complete
					res.json({
						consumption_per_day: measure.consumption_per_day,
						consumption_per_hour_device: consumption_per_hour_device,
						consumption_device: consumption_device,
						// values without device id exchange
						room: room.name, 
						period_start: measure.period_start,
						period_end: measure.period_end,
						consumption_per_hour_total: measure.consumption_per_hour_total,
						consumption_total: measure.consumption_total,
						cost_for_standard_tariff: measure.cost_for_standard_tariff,
						cost_for_white_tariff: measure.cost_for_white_tariff,
						is_standard_best: measure.is_standard_best,
						cost_offpeak: measure.cost_offpeak,
						cost_intermediate: measure.cost_intermediate,
						cost_peak: measure.cost_peak,
						progress: measure.progress
					});
				});
			});
		});
	});
});

router.get('/monthlystats/:id',function(req,res){
	Measure.findById(req.params.id).exec(function(err,measure){
		Room.findById(measure.roomId,{name:1}).exec(function(err, room){ // get room name
			function promise_consumption_device(item) {
				return new Promise (function (resolve, reject){
					Device.findById(item.deviceId,{name:1}).exec(function(err, device){
						return resolve({deviceName: device.name, consumption: item.consumption});
					});
				});
			}
			var promises_consumption_device = [];
			measure.consumption_device.forEach(function(item){
				promises_consumption_device.push(promise_consumption_device(item));
			});
			Promise.all(promises_consumption_device).then(function (consumption_device){
				// step 1 complete
				function promise_consumption_total (item){
					return new Promise (function (resolve, reject){
						Device.findById(item._id,{name:1}).exec(function(err, device){
							return resolve({deviceName: device.name, value: item.value});
						});
					});
				}
				var promises_consumption_total = [];
				measure.consumption_device.forEach(function(item){
					promises_consumption_total.push(promise_consumption_total(item));
				})
				Promise.all(promises_consumption_total).then(function(consumption_device){
					// step 2 complete
					res.json({
						consumption_device: consumption_device,
						consumption_device: consumption_device,
						// values without device id exchange
						room: room.name, 
						period_start: measure.period_start,
						period_end: measure.period_end,
						consumption_per_hour_total: measure.consumption_per_hour_total,
						consumption_total: measure.consumption_total,
						cost_for_standard_tariff: measure.cost_for_standard_tariff,
						cost_for_white_tariff: measure.cost_for_white_tariff,
						is_standard_best: measure.is_standard_best,
						cost_offpeak: measure.cost_offpeak,
						cost_intermediate: measure.cost_intermediate,
						cost_peak: measure.cost_peak,
						progress: measure.progress
					});
				});
			});
		});
	});
});

router.get('/test/:id',function(req,res){
	Measure.findOne({_id:req.params.id})
	.exec(function(err, measure){
		res.json(measure);
	});
});

module.exports = router;