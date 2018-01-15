var myApp = angular.module('myApp',['ngRoute','ngCookies','moment-picker']);

myApp.factory("log",function($http,$q,$rootScope) {
	var register = function(data) {
		$http.post('/api/log/',data).then(function(response) {
			console.log(response.data);
		});
	}

	return {
		register: register,
		getlogs: function() {
            return $http.get("/api/log/").then(function(response) {
                return response.data;
            });
        }
	};
});

myApp.factory("device",function($http,$q,$rootScope) {
	var search_list = {
		filtered: [],
		chosen: []
	}

	var search = function (keyword) { 
		return $http.get('/devices/search/'+keyword).then(function(response) {
			console.log(response.data);
			if(search_list.chosen.length > 0) {
				if (response.data.length > 0) {
				response.data.forEach(function (device){
					search_list.chosen.forEach(function (list_item){
						if (device.name == list_item.name){
							response.data.splice(response.data.indexOf(device.name,1));
						} 
					});
				});
				search_list.filtered = response.data;
				}
			} else {
				search_list.filtered = response.data;
			}
		});
	}
	var manageSearchList = function (device,option) {
		if (option == 'add') {
			if (!search_list.chosen){
				// search_list.chosen = [];
				search_list.chosen.push(device);
			} else {
				search_list.chosen.push(device);
			}
		}
		if (option == 'remove') {
			search_list.chosen.splice(search_list.chosen.indexOf(device.name),1);
		}
		search_list.filtered.splice(0, search_list.filtered.length);
	}

	return {
		search: search,
		manageSearchList: manageSearchList,
		search_list: search_list
	};
});

myApp.factory('socket', function ($rootScope) {
	var socket = io.connect();
	return {
	  on: function (eventName, callback) {
		socket.on(eventName, function () {  
		  var args = arguments;
		  $rootScope.$apply(function () {
			callback.apply(socket, args);
		  });
		});
	  },
	  emit: function (eventName, data, callback) {
		socket.emit(eventName, data, function () {
		  var args = arguments;
		  $rootScope.$apply(function () {
			if (callback) {
			  callback.apply(socket, args);
			}
		  });
		})
	  }
	};
});

myApp.factory("room",function($http,$q,$rootScope) {
	return {
		getRooms: function() {return $http.get('/api/room').then(function(response) {
			return response.data;
			});
		}
	}
});
myApp.factory("user",function($http,$q,$rootScope,$cookies) {
	return {
		getUser: function() {return $cookies.getObject("user_account");
		}
	}
});

myApp.config(function($routeProvider){
	$routeProvider.when('/', {
		controller:'DashboardController',
		templateUrl: 'views/dashboard.html'
	})
	.when('/devices', {
		controller:'DevicesController',
		templateUrl: 'views/devices.html'
	})
	.when('/statistics', {
		controller:'StatisticsMenuController',
		templateUrl: 'views/statistics_menu.html'
	})
	.when('/statistics/:id',{
		controller:'StatisticsController',
		templateUrl: 'views/statistics.html'
	})
	.when('/account',{
		controller:'UsersController',
		templateUrl: 'views/account.html'
	})
	.otherwise({
		redirectTo: '/'
	});
});

