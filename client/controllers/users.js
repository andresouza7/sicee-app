var myApp = angular.module('myApp');

myApp.controller('UsersController', ['$scope', '$cookies','$interval', '$http', '$location', '$routeParams', function($scope,$cookies, $interval, $http, $location, $routeParams){
	console.log('UsersController loaded...');

	var usersController = this;
	usersController.login_data = {
		username:"",
		password:"",
	}
	usersController.loginAlert = false;

	usersController.debug = function () {
		console.log(usersController.errors);
	}

	usersController.register = function () {
		usersController.new_user.errors = null;
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
			usersController.setCookieData(usersController.user);
			console.log(response.data);
			window.location.reload();
		}, function (error) {
			console.log("err");
		});
	}
	// user password has a hash encryption so has to be updated in a different call
	usersController.updateUserPassword = function(){
		$http.post('/users/password', usersController.user).then(function(response) {
			console.log(response.data);
			// window.location.reload();
		}, function (error) {
			console.log("err");
		});
	}

	usersController.login = function () {
		// console.log(usersController.loginAlert);
		$http.post('/users/login/', usersController.login_data).then(function(response) {
			console.log(response.data);
			usersController.setCookieData(response.data);
			usersController.getCookieData();
			window.location.reload();
		}, function (error) {
			console.log("err");
			usersController.loginAlert = true;
		});
	}

	// ANGULAR COOKIE HANDLERS
	usersController.setCookieData = function(user_account) {
		$cookies.putObject("user_account", user_account);
	}
	usersController.getCookieData = function() {
		usersController.user = $cookies.getObject("user_account");
		// console.log(usersController.user);
	}
	// Logout method
	usersController.clearCookieData = function() {
		$cookies.remove("user_account");
		usersController.getCookieData(); // user variable becomes undefined since there is no data in session
		window.location.reload();
	}

	usersController.hardreset = function () {
		if (confirm("Todas as regras programadas e os dados coletados serão apagados. Confirmar execução?")) {
			if (confirm("Tem certeza de verdade?")) {
				if (confirm("Mesmo?")) {
					$http.delete('/api/hardreset').then(function(response) {
						alert(response.data);
						console.log(response.data);
					});
				}
			}
		}
	}
}]);