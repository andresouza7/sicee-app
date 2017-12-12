var myApp = angular.module('myApp');

myApp.controller('DashboardController', ['$scope', '$interval', '$http', '$location', '$routeParams', function($scope,$interval, $http, $location, $routeParams){
	console.log('DashboardController loaded...');

	dashController = this;
	dashController.updateData = true;

	console.log($location.url());

	dashController.getTelemetry = function(){
		$http.get('/api/devices').then(function(devices_list) {
			$http.get('/api/telemetry').then(function(telemetry_list) {
				dashController.devices = devices_list.data;
				dashController.devices.forEach(function(device, i){
					if (device.current_state == "on") 
						device.string_state = "ligado";
					else if (device.current_state == "off")
						device.string_state = "desligado";
					telemetry_list.data.forEach(function(telemetry, index){
						if (device._id == telemetry.deviceId) {
							device.telemetry = telemetry;
						}
					});
				});
			});
		});
	}

	dashController.turnOn = function(id) {
		console.log(id);
		$http.get('/api/devices/state/update/on/'+id).then(function(response) {
            // console.log(response.data);
		});
	}
	dashController.turnOff = function(id) {
		console.log(id);
		$http.get('/api/devices/state/update/off/'+id).then(function(response) {
            // console.log(response.data);
		});
	}

    var promise = $interval(
		function () {
			dashController.getTelemetry();
			if ($location.url() != '/') {
				$interval.cancel(promise);
			}
		}, 1000);

	$scope.getDevices = function(){
		$http.get('/api/devices/state/on').then(function(response) {
            $scope.devices = response.data;
		});
	}

	$scope.updateStateOn = function(){
		var id = $routeParams.id;
		$http.put('/api/devices/state/on/'+id, $scope.device).then(function(response){
			window.location.href='#/control';
		});
    }
    $scope.updateStateOff = function(){
		var id = $routeParams.id;
		$http.put('/api/devices/state/off/'+id, $scope.device).then(function(response){
			window.location.href='#/control';
		});
	}
}]);