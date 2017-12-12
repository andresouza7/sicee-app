var request = require('request');
var http = require("http");

const db = process.argv[3];
const deviceId = process.argv[2];
console.log(db);
console.log(deviceId);

function genNextValue(prevValue, min, max) {
    var value = prevValue + ((max - min) * (Math.random() - 0.5)) * 0.03;
    value = Math.max(min, Math.min(max, value));
    return Math.round(value * 10) / 10;
}

const minPower = 100, maxPower = 1300, minVoltage = 124, maxVoltage = 125, minCurrent = 15, maxCurrent = 18;

var datapoints = [];
for (var i=0;i<1;i++) {
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

var str = deviceId+"1"+datapoints[0].voltage.toFixed(0)+datapoints[0].current.toFixed(1);

var requestData = [str];

let post_url = 'localhost';
// let post_url = 'sicee.herokuapp.com';
var options = {
  hostname: post_url,
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
  	console.log('data uploaded');
    console.log('Body: ' + body);
  });
});
req.on('error', function(e) {
  console.log('problem with request: ' + e.message);
});
req.write(JSON.stringify(requestData));
req.end();

