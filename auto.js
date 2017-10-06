var request = require('request');
var http = require("http");

function genNextValue(prevValue, min, max) {
    var value = prevValue + ((max - min) * (Math.random() - 0.5)) * 0.03;
    value = Math.max(min, Math.min(max, value));
    return Math.round(value * 10) / 10;
}

// write data to request body
setInterval(function(){
    // this will run after every 5 seconds
    const minPower = 100, maxPower = 1300, minVoltage = 115, maxVoltage = 125, minCurrent = 0.2, maxCurrent = 10;
    

	var datapoints = [];
	for (var i=0;i<4;i++) {
		let data = {
		    // power: minPower + (maxPower - minPower) * Math.random() ,
		    voltage: minVoltage + (maxVoltage - minVoltage) * Math.random(),
		    current: minCurrent + (maxCurrent - minCurrent) * Math.random()
		};
		// data.power = genNextValue(data.power, minPower, maxPower);
	    data.voltage = genNextValue(data.voltage, minVoltage, maxVoltage);
	    data.current = genNextValue(data.current, minCurrent, maxCurrent);
	    data.power = data.voltage*data.current;
	    datapoints.push(data);
	}

	// LOCAL MONGODB DEVICE IDS
	// var dID1 = "59befd62bc7c38a6a14e8660";
	// var dID2 = "59c2a2c4a2243cc629fd50c6";
	// var dID3 = "59c2a2d5a2243cc629fd50c7";
	// var dID4 = "59c2a310a2243cc629fd50c8";

	// ONLINE DATABASE DEVICE IDS
	var dID1 = "59bb338d276d090c211e3899";
	var dID2 = "59bb34386f0a1e0c7e09714f";
	var dID3 = "59c06505c509e80012fbfc99";
	var dID4 = "59c5a4788ff54a0012fa25c1";

    var requestData = 
    	[{"device_id":dID1,"power":+datapoints[0].power.toFixed(2),"voltage":datapoints[0].voltage.toFixed(2),"current":datapoints[0].current.toFixed(2)},
    	{"device_id":dID2,"power":datapoints[1].power.toFixed(2),"voltage":datapoints[1].voltage.toFixed(2),"current":datapoints[1].current.toFixed(2)},
    	{"device_id":dID3,"power":datapoints[2].power.toFixed(2),"voltage":datapoints[2].voltage.toFixed(2),"current":datapoints[2].current.toFixed(2)},
    	{"device_id":dID4,"power":datapoints[3].power.toFixed(2),"voltage":datapoints[3].voltage.toFixed(2),"current":datapoints[3].current.toFixed(2)}];

    // var requestData = '[{"device_id":"1","power":"86.4","voltage":"94","current":"0.72"},{"device_id":"2","power":"50","voltage":"120","current":"0.6"},{"device_id":"3","power":"500","voltage":"120","current":"2.3"},{"device_id":"4","power":"20","voltage":"120","current":"0.12"}]';

    // let post_url = 'localhost';
    let post_url = 'sicee.herokuapp.com';
	var options = {
	  hostname: post_url,
	  path: '/api/telemetry',
	  method: 'POST',
	  headers: {
	      'Content-Type': 'application/json',
	  }
	};
	var req = http.request(options, function(res) {
	  console.log('Status: ' + res.statusCode);
	  console.log('Headers: ' + JSON.stringify(res.headers));
	  res.setEncoding('utf8');
	  res.on('data', function (body) {
	  	console.log('data uploaded');
	    console.log('Body: ' + body);
	  });
	});
	req.on('error', function(e) {
	  console.log('problem with request: ' + e.message);
	});
    req.write(JSON.stringify(requestData));
	req.end();
  }, 5000); 

