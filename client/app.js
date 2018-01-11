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
		controller:'StatisticsController',
		templateUrl: 'views/statistics.html'
	})
	.when('/account',{
		controller:'UsersController',
		templateUrl: 'views/account.html'
	})
	.when('/books/edit/:id',{
		controller:'DevicesController',
		templateUrl: 'views/edit_book.html'
	})
	.otherwise({
		redirectTo: '/'
	});
});

