var myApp = angular.module('myApp');

myApp.controller('DevicesController', ['$scope', '$interval', '$http', '$location', '$routeParams','device','room', function($scope, $interval, $http, $location, $routeParams, device, room){
	console.log('DevicesController loaded...');

	var devController = this;
	$scope.device = device;
	$scope.templates = {
		device_filter: {url: '../templates/device_filter.html'}
	}
	room.getRooms().then(function(data){
		$scope.rooms_list = data;
	});

	devController.addRoom = function(room_name){
		$http.post('/api/room', {
			name: room_name,
			devices: $scope.device.search_list.chosen
		}).then(function(response) {
			room.getRooms().then(function(data){
				$scope.rooms_list = data;
			});
		});
	}
	devController.deleteRoom = function(room_id){
		if (confirm('Confirmar exclusão?')){
			$http.delete('/api/room/'+room_id).then(function(response){
				room.getRooms().then(function(data){
					$scope.rooms_list = data;
				});
			});
		}
	}
	devController.removeDeviceFromRoom = function(room_id,device_id){
		let data = {
			room_id: room_id,
			device_id: device_id
		};
		console.log(data);
		// if (confirm('Desassociar dispositivo deste ambiente?')){
			$http.post('/api/room/removeDevice',data).then(function(response){
				devController.getDevices();
				room.getRooms().then(function(data){
					$scope.rooms_list = data;
				});
			});
		// }
	}
	devController.addDeviceToRoom = function(room_id,device_id){
		let data = {
			room_id: room_id,
			device_id: device_id
		};
		$http.post('/api/room/addDevice',data).then(function(response){
			devController.getDevices();
			room.getRooms().then(function(data){
				$scope.rooms_list = data;
			});
		});
	}
	devController.editRoom = function(room_id,edit_room_name){
		$http.put('/api/room/'+room_id,{
			name: edit_room_name,
			devices: $scope.device.search_list.chosen
		}).then(function(response){
			devController.getDevices();
			room.getRooms().then(function(data){
				$scope.rooms_list = data;
			});
		});
	}

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
						if (response.data.pipe != ""){
							devController.tetherMsg = "Dispositivo pareado";
							devController.devices.forEach(function(item){
								if (String(item._id) == String(id))
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