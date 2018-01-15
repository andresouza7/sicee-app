var myApp = angular.module('myApp');

myApp.controller('StatisticsMenuController', ['$scope', '$interval','$http', '$location', '$routeParams','room', 
	function($scope, $interval, $http, $location, $routeParams, room){
	console.log('StatisticsMenuController loaded...');

	statsMenuController = this;
	room.getRooms().then(function(data){
		$scope.rooms_list = data;
	});
}]);