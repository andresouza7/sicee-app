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
// Notification Model
let Notification = require('../models/notification');
// Device Model
let Device = require('../models/device');

// SET DEVICE STATE ON
router.get('/devices/state/update/on', function(req, res){
	res.sendStatus(200);
	console.log(req.query.id);
	Device.update({deviceId: req.query.id}, {change_state:"on"}, function(err){
		if(err){
		  console.log(err);
		  return;
		}
	});
  });

// SET DEVICE STATE OFF
router.get('/devices/state/update/off', function(req, res){
	res.sendStatus(200);
	console.log(req.query.id);
	Device.update({deviceId: req.query.id}, {change_state:"off"}, function(err){
		if(err){
		  console.log(err);
		  return;
		}
	});
  });

// GET DEVICES STATE
router.get('/devices/state', function(req, res){
	Device.find({$where : "this.change_state != this.current_state"},{_id:0,deviceId:1,change_state:1}).
	  exec(function(err, devices){
		if(err){
		  console.log(err);
		} else {
		  console.log(devices);
		  res.json(devices);
		}
	  });

	// res.json(JSON.parse('[{"id":"01","state":"on"},{"id":"02","state":"on"},{"id":"03","state":"on"},{"id":"04","state":"on"},{"id":"05","state":"on"}]'));
	// res.send(400);
  });

// GET DEVICES
router.get('/devices', function(req, res){
	Device.
	  find({}).
	  exec(function(err, devices){
		if(err){
		  console.log(err);
		} else {
		  console.log(devices);
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
	var getTelemetry = function (callback) {
		Device.find({}).count().exec(function (err, numberOfDevices) {
			callback(numberOfDevices);
		});
	}
	
	getTelemetry(function(numberOfDevices) {
		console.log('total of devices: '+numberOfDevices);
		console.log('Id received from query: '+req.query.deviceId);
		let deviceId = req.query.deviceId;
		// let ObjectId = require('mongodb').ObjectId;
		if(typeof deviceId != 'undefined') { // DISPLAYING DATA FOR SPECIFIC DEVICE
			Telemetry.find({deviceId:deviceId}).sort({timestamp:-1}).limit(8).exec(function(err, telemetry_list) {
				res.json(telemetry_list.reverse());
				// console.log(telemetry_list);
			});
		} else if (typeof deviceId == 'undefined')  { // DISPLAYING DATA FOR ALL DEVICES
			Telemetry.find({}).sort({timestamp:-1}).limit(numberOfDevices).exec(function(err, telemetry_list) {
				res.json(telemetry_list.reverse());
				console.log(telemetry_list);
			});
		}
	});
});


// SCHEDULE EVENTS
// TURN ON
router.post('/schedule/on_once',function(req,res){
	console.log(req.body);
	let deviceName = req.body.deviceName;
	let startTime = req.body.startTime;
	var mongoConnectionString = config.database;
	var agenda = new Agenda({db: {address: mongoConnectionString}});
	
	let startJobName = 'Ligar '+deviceName; 
	agenda.define(startJobName, function(job, done) {
	  // User.remove({lastLogIn: { $lt: twoDaysAgo }}, done);
	  console.log('Ligando '+deviceName+'...');
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
	let deviceName = req.body.deviceName;
	let startTime = req.body.startTime;
	var mongoConnectionString = config.database;
	var agenda = new Agenda({db: {address: mongoConnectionString}});
	
	let startJobName = 'Desligar '+deviceName; 
	agenda.define(startJobName, function(job, done) {
	  // User.remove({lastLogIn: { $lt: twoDaysAgo }}, done);
	  console.log('Desligando '+deviceName+'...');
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
	let deviceName = req.body.deviceName;
	let startTime = req.body.startTime;
	let endTime = req.body.endTime;
	var mongoConnectionString = config.database;
	var agenda = new Agenda({db: {address: mongoConnectionString}});
	
	let startJobName = 'Ligar '+deviceName; 
	agenda.define(startJobName, function(job, done) {
	  // User.remove({lastLogIn: { $lt: twoDaysAgo }}, done);
	  console.log('Ligando '+deviceName+'...');
	  done();
	});
	agenda.on('ready', function() {
	  agenda.schedule(startTime, startJobName);
	  agenda.start();
	});

	let endJobName = 'Desligar '+deviceName; 
	agenda.define(endJobName, function(job, done) {
	  // User.remove({lastLogIn: { $lt: twoDaysAgo }}, done);
	  console.log('Desligando '+deviceName+'...');
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
	  var request = require('request');
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

// FUNCTIONS FOR PROCESSING TELEMETRY DATA
// router.post('/telemetry', function(req, res){
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
 
 //    var request = require('request');
	// request.post({
	//      url: "http://localhost:8080",
	//      headers: {
	//         "Content-Type": "application/json"
	//      },
	//      body: telemetry_list,
	//      json:true
	// }, function(error, response, body){
	//    // console.log(error);
	//    // console.log(JSON.stringify(response));
	//    // console.log(body);
	// });
// });

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

// ======================================================
// OLD COLD - USING OBJECTID AS DEVICE ID
// ======================================================
// SAVE NEW TELEMETRY TO DATABASE
router.post('/null', function(req, res){
	let datastring = JSON.stringify(req.body);
	let data = JSON.parse(datastring);
	var IDs = [];
	let IDs_Typeof_ObjectID = true;
	let All_Fields_Provided = true;
	data.forEach(function(item){
		if (mongoose.Types.ObjectId.isValid(item.device_id)) {
			IDs.push(item.device_id);
		} else {
			IDs_Typeof_ObjectID = false;
		}
		if (typeof item.power == 'undefined' || typeof item.voltage == 'undefined' || typeof item.current == 'undefined') {
			All_Fields_Provided = false;
		}
	})

	if (IDs_Typeof_ObjectID && All_Fields_Provided) {
		var invalid_IDs = [];
		var invalid_IDs_string = "";
		IDs.forEach(function(ID, index){
			let ObjectId = require('mongodb').ObjectId;
			Device.findOne({_id: ObjectId(ID)}).exec(function(err, device) {
				if (err) {
					// res.send(404);
					// callback(err);
				} else {
					if (device) {
						// console.log(device._id);
					} else {
						invalid_IDs.push(ID);
						invalid_IDs_string += ID+'\n';
						// console.log('wrong or inexistant id');
						console.log(invalid_IDs);
					}
				}
				// console.log('index = '+index);
				if (index == IDs.length-1) {
					// console.log('finish loop');
					if (!invalid_IDs.length > 0) {
						// console.log('GOOD TO GO');
						// TELEMETRY READING FUNCTIONS GO HERE
						// =========================================================
						// === UPDATE DB USING JSON ===
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

							// DETECT IF VOLTAGE IS 127V OR 220V
							const voltage_max_threshold_127 = 135.0;
							const voltage_min_threshold_127 = 110.0;
							const voltage_max_threshold_220 = 230.0;
							const voltage_min_threshold_220 = 210.0;
							if (item.voltage < 160) { // voltage is supposed to be 127v
								if (item.voltage < voltage_min_threshold_127 || item.voltage > voltage_max_threshold_127) {
									let notification = new Notification();
									notification.nature = 'voltage';
									notification.description = 'A tensão está em '+item.voltage+' V. Pode haver um problema neste ponto da rede elétrica';
									notification.save(function(err){
										if (err) {
											console.log(err);
											return;
										}
									});
								}
							} else { // voltage is supposed to be 220v
								if (item.voltage < voltage_min_threshold_220 || item.voltage > voltage_max_threshold_220) {
									let notification = new Notification();
									notification.nature = 'voltage';
									notification.description = 'A tensão está em '+item.voltage+' V. Pode haver um problema neste ponto da rede elétrica';
									notification.save(function(err){
										if (err) {
											console.log(err);
											return;
										}
									});
								}
							}

							// DETECT IF CURRENT IS TOO HIGH
							const current_max_threshold = 15.0;
							if (item.current > current_max_threshold) {
								let notification = new Notification();
								notification.nature = 'current';
								notification.description = 'Valor alto de corrente registrado: '+item.current+' A';
								notification.save(function(err){
									if (err) {
										console.log(err);
										return;
									}
								});
							}
						});

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

					    // SAVA DEVICES CONSUMPTION DATA TO DATABASE
					    Consumption.insertMany(consumption_list,function(err){
					    	if(err){
					    		console.log(err);
					    	}
					    });

					    // LOOK FOR VOLTAGE OR CURRENT ANOMALY IN TELEMETRY DATA
					    // TELEMETRY READING FUNCTIONS END HERE
					    // =========================================================================
						res.send('Dados registrados');
					} else {
						console.log('ERROR WITH SOME ID');
						res.send('Erro. IDs nao reconhecidos:\n'+invalid_IDs_string);
					}
				}
			});
		});	
	} else {
		res.send('Erro no formato dos dados, certifique-se de estar no formato JSON e que contém os campos:\n{device_id:xx,power:xx,voltage:xx,current:xx}');
	}
});

// SAVE TELEMETRY TO DATABASE
router.post('/telemetry', function(req, res){
	let datastring = JSON.stringify(req.body);
	let data = JSON.parse(datastring);
	var IDs = [];
	let All_Fields_Provided = true;
	data.forEach(function(item){
		IDs.push(item.device_id);
		if (typeof item.device_id == 'undefined' || typeof item.power == 'undefined' || typeof item.voltage == 'undefined' || typeof item.current == 'undefined') {
			All_Fields_Provided = false;
		}
	})

	// Adds device to the database if it isnt yet
	IDs.forEach(function(ID, index){
		Device.findOne({deviceId: ID}).exec(function(err, device) {
			if (err) {
				// res.send(404);
				// callback(err);
			} else {
				if (device) {
					// console.log(device._id);
				} else {
					let newDevice = new Device();
					newDevice.deviceId = ID;
					newDevice.name = "Medidor"+ID;
					newDevice.save(function(err){
						if (err) {
							console.log(err);
							return;
						}
					});
				}
			}
		});
	});

	if (All_Fields_Provided) {
		// console.log('GOOD TO GO');
		// TELEMETRY READING FUNCTIONS GO HERE
		// =========================================================
		// === UPDATE DB USING JSON ===
		let json_telemetry_data = req.body;
		var telemetry_list = [];
		var consumption_list = [];
		
		var deviceSamplesTaken = [];
		json_telemetry_data.forEach(function(item){
			// To save the trouble of implementing a filter function on arduino
			// it simply takes as many RF samples as it can in a 2sec interval
			// and leaves the server to do the hard work.
			// The following snippet makes sure that only one sample of each device is saved
			var isRepeated=false;
			deviceSamplesTaken.forEach(function (id, index){
				if (item.device_id == id) {
					isRepeated=true;
				}
				if(index==deviceSamplesTaken.length && isRepeated==false)
					deviceSamplesTaken.push(item.device_id);
			});
			console.log("deviceSamplesTaken: "+deviceSamplesTaken);

			let samplingPeriod = 3.0/3600.0; // 3 seconds converted to hour
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

			// UPDATE CURRENT DEVICE STATE
			if (item.power>0) {
				Device.update({deviceId: item.device_id}, {current_state:"on"}, function(err){
					if(err){
					  console.log(err);
					  return;
					}
				});
			} else if (item.power==0) {
				Device.update({deviceId: item.device_id}, {current_state:"off"}, function(err){
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
			if (item.voltage < 160) { // voltage is supposed to be 127v
				if (item.voltage < voltage_min_threshold_127 || item.voltage > voltage_max_threshold_127) {
					let notification = new Notification();
					notification.nature = 'voltage';
					notification.description = 'A tensão está em '+item.voltage+' V. Pode haver um problema neste ponto da rede elétrica';
					notification.save(function(err){
						if (err) {
							console.log(err);
							return;
						}
					});
				}
			} else { // voltage is supposed to be 220v
				if (item.voltage < voltage_min_threshold_220 || item.voltage > voltage_max_threshold_220) {
					let notification = new Notification();
					notification.nature = 'voltage';
					notification.description = 'A tensão está em '+item.voltage+' V. Pode haver um problema neste ponto da rede elétrica';
					notification.save(function(err){
						if (err) {
							console.log(err);
							return;
						}
					});
				}
			}

			// DETECT IF CURRENT IS TOO HIGH
			const current_max_threshold = 15.0;
			if (item.current > current_max_threshold) {
				let notification = new Notification();
				notification.nature = 'current';
				notification.description = 'Valor alto de corrente registrado: '+item.current+' A';
				notification.save(function(err){
					if (err) {
						console.log(err);
						return;
					}
				});
			}
		});

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

			// LOOK FOR VOLTAGE OR CURRENT ANOMALY IN TELEMETRY DATA
			// TELEMETRY READING FUNCTIONS END HERE
			// =========================================================================
		// res.send('Dados registrados');
		res.json(JSON.parse('[{"id":"01","state":"off"},{"id":"02","state":"off"},{"id":"03","state":"off"}]'));
		// res.json(JSON.parse('[{"state":"nochanges"}]'));			
	} else {
		res.send('Erro no formato dos dados, certifique-se de estar no formato JSON e que contém os campos:\n{device_id:xx,power:xx,voltage:xx,current:xx}');
	}
});

router.post('/telemetry/test', function(req, res) {
	var str = req.body;
	var telemetry_list = [];
	req.body.forEach(function(item, index){
		let devId = item.substring(0, 2);
		let power = parseFloat(item.substring(2,9));
		let vrms = parseFloat(item.substring(9,15));
		let irms = parseFloat(item.substring(15,20));
		let telemetry = new Telemetry();

		telemetry.deviceId = devId;
		telemetry.power = power;
		telemetry.voltage = vrms;
		telemetry.current = irms;
		telemetry.timestamp = Date.now();
		telemetry_list.push(telemetry);

		Telemetry.insertMany(telemetry_list,function(err){
			if(err){
				console.log(err);
			}
		});
	});
	Device.find({$where : "this.change_state != this.current_state"},{_id:0,deviceId:1,change_state:1}).
	exec(function(err, devices){
	  if(err){
		console.log(err);
	  } else {
		console.log(devices);
		res.json(devices);
		devices.forEach(function(device){
			Device.update({deviceId: device.deviceId}, {current_state:device.change_state}, function(err){
				if(err){
				  console.log(err);
				  return;
				}
			});
		});
	  }
	});
});

module.exports = router;