var myApp = angular.module('myApp');

myApp.controller('StatisticsMenuController', ['$scope', '$interval','$http', '$location', '$routeParams','room','user', 
	function($scope, $interval, $http, $location, $routeParams, room, user){
	console.log('StatisticsMenuController loaded...');

	statsMenuController = this;
	room.getRooms().then(function(data){
		$scope.rooms_list = data;
	});
	$scope.user = user.getUser();
}]);