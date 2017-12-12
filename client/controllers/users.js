var myApp = angular.module('myApp');

myApp.controller('UsersController', ['$scope', '$cookies','$interval', '$http', '$location', '$routeParams', function($scope,$cookies, $interval, $http, $location, $routeParams){
	console.log('UsersController loaded...');

	var usersController = this;
	usersController.login_data = {
		username:"",
		password:"",
	}

	usersController.debug = function () {
		console.log(usersController.errors);
	}

	usersController.register = function () {
		usersController.new_user.errors = null;
		// usersController.new_user.registered = null;
		$http.post('/users/register/', usersController.new_user).then(function(response) {
			if (response.data.errors) {
				usersController.errors = response.data.errors;
			} else {
				usersController.new_user.registered = true;
			}
			console.log(response.data);
			// window.location.reload();
		}, function (error) {
			console.log("err");
		});
	}

	usersController.updateUserData = function(){
		$http.put('/users', usersController.user).then(function(response) {
			if (response.data.errors) {
				usersController.errors = response.data.errors;
			}
			console.log(response.data);
			// window.location.reload();
		}, function (error) {
			console.log("err");
		});
	}
	usersController.updateUserPassword = function(){
		$http.post('/users/password', usersController.user).then(function(response) {
			console.log(response.data);
			// window.location.reload();
		}, function (error) {
			console.log("err");
		});
	}

	usersController.login = function () {
		$http.post('/users/login/', usersController.login_data).then(function(response) {
			console.log(response.data);
			usersController.setCookieData(response.data);
			usersController.getCookieData();
			window.location.reload();
		}, function (error) {
			console.log("err");
		});
	}

	usersController.setCookieData = function(user_account) {
		$cookies.putObject("user_account", user_account);
	}
	usersController.getCookieData = function() {
		usersController.user = $cookies.getObject("user_account");
		console.log(usersController.user);
	}
	usersController.clearCookieData = function() {
		$cookies.remove("user_account");
		usersController.getCookieData();
		window.location.reload();
	}
}]);