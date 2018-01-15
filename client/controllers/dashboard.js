var myApp = angular.module('myApp');

myApp.controller('DashboardController', 
	['$scope', '$cookies', '$interval', '$timeout', '$http', '$location', '$routeParams','log','socket','user', 
	function($scope,$cookies, $interval, $timeout, $http, $location, $routeParams,log,socket,user){
	console.log('DashboardController loaded...');

	dashController = this;
	dashController.user = $cookies.getObject("user_account");
	log.getlogs().then(function(data){
		$scope.logs = data;
	});
	$scope.user = user.getUser();

	this.filter_list; // filters devices in the database by user input
	this.auto_dev_list; // devices from filter_list chosen by user

	this.getLocalDate = function (date) { // function for time conversion used in the API
		if (date){ // if date was provided
			
		} else {
			let dateUTC = new Date(Date.now()); 
			let offsetMs = dateUTC.getTimezoneOffset()*60000;
			let offsetHr = dateUTC.getTimezoneOffset()/60;
			let localDate = new Date(Date.now()-offsetMs);
			let year = localDate.getFullYear();
			let month = localDate.getMonth()+1; //this offset will have to be apllied in each API route when retrieving data.
			// getMonth()+1 stores months in the range of 1 to 12, which makes it easier to display data in the UI
			// When getting data from the API, just add the offset to obtain months in the range of 0 to 11, which
			// is the javascript standard.
			let day = localDate.getDate();
			let hour = localDate.getHours()+offsetHr; // prevents the bug of the final 3h of the day being added to the next one
				if (hour >= 24)
					hour = hour - 24;
			return ({
				timestamp: localDate,
				year: year,
				month: month,
				day: day,
				hour: hour
			});
		}
	}

	dashController.checkConnection = function () {
		dashController.connectionStatus;
		$http.get('/api/checkConnection').then(function(response) {
			if (response.data.shutdown == false){ // means the system is online
				dashController.connectionStatus = true;
			} else if (response.data.shutdown == true){
				dashController.connectionStatus = false;
			}
		});
	}

	// Get telemetry from all devices
	dashController.getTelemetry = function(){
		$http.get('/api/devices').then(function(response) {
			dashController.devices = response.data;
			dashController.devices.forEach(function (device){
				if (device.telemetry){ 
					let timestampNow = dashController.getLocalDate().timestamp.getTime(); // converts date format to milliseconds
					// console.log("DATE NOW "+timestampNow);
					let telemetryTimestamp = new Date(device.telemetry.timestamp).getTime() // converts date format to milliseconds
					// console.log("TELEMETRY DATE "+telemetryTimestamp);
					if (timestampNow - telemetryTimestamp  <= 12000) { // if within the sampling period, then it is connected
						device.connected = true;
					} else { 
						device.connected = false;}
				} else {
					device.connected = false;
				}
			});
		});
	}
	dashController.debug = function () {
		console.log(dashController.new_rule);
	}

	dashController.turnOn = function(id,name) {
		console.log(id);
		$http.get('/api/devices/state/update/on/'+id).then(function(response) {
			log.register({event: "Equipamento "+name+" foi ligado por "+dashController.user.username});
            // console.log(response.data);
		});
	}
	dashController.turnOff = function(id,name) {
		console.log(id);
		$http.get('/api/devices/state/update/off/'+id).then(function(response) {
			log.register({event: "Equipamento "+name+" foi desligado por "+dashController.user.username});
            // console.log(response.data);
		});
	}

	dashController.searchDevice = function () { //	DANDO ERRO, AJEITAR DEPOIS
		$http.get('/devices/search/'+dashController.device_filter).then(function(response) {
			if(dashController.auto_dev_list) {
				if (response.data.length > 0) {
				response.data.forEach(function (device){
					dashController.auto_dev_list.forEach(function (list_item){
						if (device.name === list_item.name){
							device.splice(device.indexOf(device.name,1));
						} 
					});
				});
				dashController.filter_list = response.data;
				}
			} else {
				dashController.filter_list = response.data;
			}
			// dashController.filter_list = response.data;
			console.log(response.data);
		});
		// console.log("lj");
	}
	dashController.manage_dev_list = function (device,option) {
		if (option == 'add') {
			if (!dashController.auto_dev_list){
				dashController.auto_dev_list = [];
				dashController.auto_dev_list.push(device);
				console.log(dashController.filter_list);
			} else {
				dashController.auto_dev_list.push(device);
			}
		}
		if (option == 'remove')
			dashController.auto_dev_list.splice(dashController.auto_dev_list.indexOf(device.name),1);
	}
	
	dashController.schedule = function() {
		let allDataProvided = true;
		if (dashController.auto_dev_list)
			if (!dashController.on_checked && !dashController.off_checked)
				allDataProvided = false;
		if (dashController.on_checked)
			if (!dashController.newJob.startTime)
				allDataProvided = false;
		if (dashController.off_checked)
			if (!dashController.newJob.endTime)
			allDataProvided = false;
		if (allDataProvided) {
			let data = {
				devices_list: dashController.auto_dev_list,
				notify: {
					checked: dashController.sms_checked,
					username: dashController.user.username,
					phone: dashController.user.phone
					},
				action: {
					on:{
						checked: dashController.on_checked,
						time: dashController.newJob.startTime
					},
					off: {
						checked: dashController.off_checked,
						time: dashController.newJob.endTime
					}
				}
			}
			console.log(data);
			$http.post('/api/schedule/',data).then(function(response) {
				console.log(response.data);
				dashController.searchSchedule(); // update schedule list with new task
			}, function (error){
				console.log(error);
				alert("Ocorreu um erro, tente novamente");
			});
		} else alert("Erro. Preencha todos os campos necessários.");
	}
	dashController.searchSchedule = function () { //	DANDO ERRO, AJEITAR DEPOIS
		$http.get('/api/schedule/search').then(function(response) {
			dashController.schedule_list = response.data;
			// console.log(response.data);
		});
	}
	dashController.deleteSchedule = function (id) { //	DANDO ERRO, AJEITAR DEPOIS
		$http.delete('/api/schedule/delete/'+id).then(function(response) {
			// console.log(response.data);
			dashController.searchSchedule();
		});
	}

	dashController.setRule = function() {
		let data = {
			devices: dashController.auto_dev_list,
			params: dashController.new_rule,
			userInfo: {
				username: dashController.user.username,
				phone: dashController.user.phone
			}
		}
		console.log(data);
		$http.post('/api/setRule/',data).then(function(response) {
			console.log(response.data);
		}, function (error){
			console.log(error);
			alert("Ocorreu um erro, tente novamente");
		});
	}

	dashController.getSystemStats = function () { 
		$http.get('/api/systemstats').then(function(response) {
			dashController.system_stats = response.data;
		});
	}

	// ECONOMY RULES
	dashController.getEconomyRules = function () {
		$http.get('/api/economy_rule').then(function(response) {
			dashController.economyRules = response.data;
			for (index in dashController.economyRules){
				if (dashController.economyRules[index].length == 0){
					dashController.economyRules.splice(index,1);
					index = index - 1;
				}
			}
		});
	}
	dashController.deleteEconomyRule = function (id) {
		$http.delete('/api/economy_rule/'+id).then(function(response) {
			console.log(response);
			dashController.getEconomyRules();
		});
	}
	dashController.addEconomyRule = function () {
		var start;
		var end;
		var ts = new Date();
		if (dashController.newRule.peakPeriod == true) {
			start = new Date(ts.getFullYear(),ts.getMonth(),ts.getDate(),19); console.log("start "+start);
			end = new Date(ts.getFullYear(),ts.getMonth(),ts.getDate(),22); console.log("end "+end);
		} else {
			start = dashController.newRule.startTime;
			end = dashController.newRule.endTime;
		}
		let data = {
			deviceId: dashController.auto_dev_list[0]._id, // there will be only one device in the list
			start: start,
			end: end
		};
		$http.post('/api/economy_rule',data).then(function(response) {
			console.log(response);
			dashController.getEconomyRules();
		});
	}
	
	socket.on('telemetry', function (data) {
		log.getlogs().then(function(data){
			$scope.logs = data;
		});
		dashController.checkConnection();
		dashController.getSystemStats();
		dashController.getTelemetry();
		dashController.searchSchedule();
	});
	socket.on('connectionStatus', function (data) {
		dashController.checkConnection();
	});
	// dashController.setInputTime = function () {
	// 	dashController.newJob = {startTime:new Date(),endTime:new Date()};
	// }
}]);