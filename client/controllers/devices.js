var myApp = angular.module('myApp');

myApp.controller('DevicesController', ['$scope', '$interval', '$http', '$location', '$routeParams', function($scope, $interval, $http, $location, $routeParams){
	console.log('DevicesController loaded...');

	var devController = this;

	devController.getDevices = function(){
		$http.get('/api/devices').then(function(response) {
		devController.devices = response.data;
			devController.devices.forEach(function (item){
				if (item.pipe == null)
					item.isTethered = false; 
				else
					item.isTethered = true;
			});
		});
	}

	devController.editDevice = function(id){
		devController.devices.forEach(function (item, index) {
			if (item._id == id) {
				item.name = devController.edit_device.name;
				$http.put('/devices/'+id, devController.edit_device).then(function(response) {
					// console.log(devController.devices);
					// console.log(response.data);
					// window.location.href='#/';
				});
			}
		});
	}

	devController.addDevice = function(){
		$http.post('/devices/add', devController.new_device).then(function(response) {
			response.data.forEach(function(item) {
				devController.devices.push(item);
			});
			console.log(response.data);
			// window.location.href='#/';
		});
	}

	devController.deleteDevice = function(id){
		if (confirm("Apagar este dispositivo excluirá também as estatísticas referentes a ele. Deseja prosseguir?")){
			$http.delete('/devices/'+id).then(function(response){
				devController.devices.forEach(function(item,index) {
					if (item._id == id) {
						devController.devices.splice(index,1);
					}
				});
				window.location.href='#/devices';
			});
		} 
	}

	// tethers a virtual device to a physical board
	devController.rfTether = function(id, sync){
		let info = {
			id,
			sync
		};
		$http.post('/devices/sync/', info).then(function(response){
			console.log(response.data);
			var times = 60;
			var promise = $interval(
			   	function () {
					$http.get('/devices/'+id).then(function(response) {
						console.log(response.data);
						var retry = -(60 - (times++));
						devController.tetherMsg = "Aguardando conexão, " + retry + " segundos";
						if (response.data.pipe != null){
							devController.tetherMsg = "Dispositivo pareado";
							devController.devices.forEach(function(item){
								if (item._id == id)
									item.isTethered = true;
							})
							$interval.cancel(promise);
							location.reload();
						} 
						if (retry == 30) {
							devController.tetherMsg = "Tempo esgotado, conexão sem sucesso";
							$interval.cancel(promise);
							location.reload();
						}
					});
				  	
			   }, 1000, 60);
		});
	}

}]);