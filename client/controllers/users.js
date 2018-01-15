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
	usersController.getUsersList = function () {
		$http.get('/users').then(function(response){
			usersController.users_list = response.data;
		});
	}

	usersController.register = function () { 
		console.log("function called");
		usersController.new_user.errors = null;
		$http.post('/users/register/', usersController.new_user).then(function(response) {
			console.log(response.data);
			if (response.data.errors) {
				usersController.errors = response.data.errors;
			} else {
				usersController.new_user.registered = true;
				usersController.login_data.username = usersController.new_user.username;
				usersController.login_data.password = usersController.new_user.password;
				usersController.login();
			}
		}, function (error) {
			console.log("err");
		});
	}

	usersController.updateUserData = function(){
		$http.put('/users', usersController.user).then(function(response) {
			usersController.setCookieData(usersController.user);
			window.location.reload();
		}, function (error) {
			console.log("err");
		});
	}
	// user password has a hash encryption so has to be updated in a different call
	usersController.updateUserPassword = function(){
		$http.post('/users/password', usersController.user).then(function(response) {
			window.location.reload();
		}, function (error) {
			console.log("err");
		});
	}

	usersController.login = function () {
		// console.log(usersController.loginAlert);
		console.log("login data"+usersController.login_data);
		$http.post('/users/login/', usersController.login_data).then(function(response) {
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
		$location.path('/');
	}

	usersController.hardreset = function () {
		if (confirm("Todas as informações serão excluídas do banco de dados. Deseja proseguir?")) {
			if (confirm("Tem certeza de verdade?")) {
				if (confirm("Mesmo?")) {
					$http.delete('/api/hardreset').then(function(response) {
						alert("Sistema resetado!");
						usersController.clearCookieData();
						window.location.reload();
						$location.path('/');
					});
				}
			}
		}
	}

	usersController.edit_system_info = function () {
		$http.post('/users/system_info/', usersController.system_info).then(function(response) {
			window.location.reload();
		});
	}
	usersController.get_system_info = function () {
		$http.get('/users/system_info/', usersController.system_info).then(function(response) {
			usersController.system_info = response.data;
		});
	}
}]);