var myApp = angular.module('myApp',['ngRoute','ngCookies','moment-picker']);

myApp.factory("Alert",['$timeout',function($timeout) {
	var type;
	var msg;

	this.setMsg = function(inputmsg) {
		msg = inputmsg;
	};
	this.class = function(success) {
		if (success)
		return "alert alert-success";
		else return "alert alert-danger";
	}

	return {
		msg: msg,
		class: this.class
	};
  }]);

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

