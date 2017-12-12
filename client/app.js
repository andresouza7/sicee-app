var myApp = angular.module('myApp',['ngRoute','ngCookies']);

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