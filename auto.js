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
    const minPower = 100, maxPower = 1300, minVoltage = 115, maxVoltage = 125, minCurrent = 0.2, maxCurrent = 20;
    

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

    var requestData = 
    	[{"device_id":"1","power":+datapoints[0].power.toFixed(2),"voltage":datapoints[0].voltage.toFixed(2),"current":datapoints[0].current.toFixed(2)},
    	{"device_id":"2","power":datapoints[1].power.toFixed(2),"voltage":datapoints[1].voltage.toFixed(2),"current":datapoints[1].current.toFixed(2)},
    	{"device_id":"3","power":datapoints[2].power.toFixed(2),"voltage":datapoints[2].voltage.toFixed(2),"current":datapoints[2].current.toFixed(2)},
    	{"device_id":"4","power":datapoints[3].power.toFixed(2),"voltage":datapoints[3].voltage.toFixed(2),"current":datapoints[3].current.toFixed(2)}];

    // var requestData = '[{"device_id":"1","power":"86.4","voltage":"94","current":"0.72"},{"device_id":"2","power":"50","voltage":"120","current":"0.6"},{"device_id":"3","power":"500","voltage":"120","current":"2.3"},{"device_id":"4","power":"20","voltage":"120","current":"0.12"}]';

	var options = {
	  hostname: 'localhost',
	  port: 8080,
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
	    console.log('Body: ' + body);
	  });
	});
	req.on('error', function(e) {
	  console.log('problem with request: ' + e.message);
	});
    req.write(JSON.stringify(requestData));
	req.end();
	console.log('data uploaded');
  }, 5000); 

