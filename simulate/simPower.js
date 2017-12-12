var request = require('request');
var http = require("http");

function genNextValue(prevValue, min, max) {
    var value = prevValue + ((max - min) * (Math.random() - 0.5)) * 0.03;
    value = Math.max(min, Math.min(max, value));
    return Math.round(value * 10) / 10;
}

const deviceId = process.argv[2];
const vrms = process.argv[3];
const irms = process.argv[4];
// write data to request body
setInterval(function(){
    var str = deviceId+"1"+vrms+irms;
	var requestData = 
	[str];

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
  }, 5000); 

