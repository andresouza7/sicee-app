var myApp = angular.module('myApp');

myApp.controller('StatisticsController', ['$scope', '$interval','$http', '$location', '$routeParams', function($scope, $interval, $http, $location, $routeParams){
	console.log('StatisticsController loaded...');

	statsController = this;

	statsController.getConsumptionPerDay = function(){
		$http.get('/api/consumptionPerDay').then(function(response) {
			statsController.consumption = response.data;
			let datenow = new Date(Date.now());
			var daysOfMonth = new Date(datenow.getFullYear(),datenow.getMonth()+1,0);

			var consMonth = 0;
			var consToday = 0;
			statsController.consumption.forEach(function (item) {
				consMonth += item.total;
				if (datenow.getDate() == item._id)
					consToday = item.total;
			});
			statsController.consMonth = consMonth;
			statsController.avg = consMonth/statsController.consumption.length;
			statsController.avgVsToday = ((consToday/statsController.avg)-1)*100;
			statsController.monthPrediction = statsController.avg*daysOfMonth.getDate();

			var datapoints = {
				x:[],
				avg:[],
				y:[]
			};
			var avgbgcolor = [];
			var bgcolor = [];
			
			for (let i=1; i<=daysOfMonth.getDate(); i++){
				datapoints.x.push(0);
				datapoints.avg.push(statsController.avg);
				avgbgcolor.push('rgba(0, 0, 0, 0.5)');
				bgcolor.push('rgba(75, 234, 40, 0.8)');
				datapoints.y.push(i);
				statsController.consumption.forEach(function (item) {
					if (datapoints.y[i-1]==item._id) {
						datapoints.x[i-1]=item.total.toFixed(2);
					} 
				})
				
			}

			var chartData = {
				labels: datapoints.y,
				datasets: [{
					type: 'bar',
					label: 'kWh por dia',
					backgroundColor: bgcolor,
					borderWidth: 2,
					fill: false,
					data: datapoints.x,
				}, {
					type: 'line',
					label: 'Média no mês',
					fill: false,
					backgroundColor: 'grey',
					data: datapoints.avg,
					borderColor: 'grey',
					borderWidth: 2,
				}]
			};

			var ctx = document.getElementById("dailyConsumptionChart");
			var dailyConsumptionChart = new Chart(ctx, {
				type: 'bar',
				data: chartData,
				options: {
					elements: {
						point: {
							radius: 0
						}
					},
					scales: {
						yAxes: [{
							ticks: {
								beginAtZero:true
							}
						}]
					}
				}
			});
		});
	}

	statsController.getConsumptionPerHour = function(){
		$http.get('/api/consumptionPerHour').then(function(response) {
			var apiDataPoints = response.data.consumption;
			statsController.excess_consumption = response.data.excess;
			
			var uiDataPoints = {
				x:[],
				y:[]
			};
			let bgcolor = [];
			for (let hour=0; hour<=23; hour++){
				apiDataPoints.forEach(function (item, index) {
					if (item._id == hour) {
						uiDataPoints.x.push(item.total.toFixed(2));
						let bin = item._id+1;
						uiDataPoints.y.push(item._id+"-"+bin+"h");
						
						let highlight = false;
						statsController.excess_consumption.forEach(function (excess_item){
							if (excess_item._id == item._id)
								highlight = true;
						});
						if (highlight) bgcolor.push('red');
						else bgcolor.push('rgba(75, 192, 230, 0.8)');
					}	
				});
			}

			var ctx = document.getElementById("hourlyConsumptionChart");
			var hourlyConsumptionChart = new Chart(ctx, {
				type: 'bar',
				data: {
					labels: uiDataPoints.y,
					datasets: [{
						label: 'Consumo horário hoje (h/d x Wh)',
						data: uiDataPoints.x,
						backgroundColor: bgcolor,
						borderWidth: 2
					}]
				},
				options: {
					scales: {
						yAxes: [{
							ticks: {
								beginAtZero:true
							}
						}]
					}
				}
			});
		});
	}

	statsController.getConsumptionPerDevice = function(){
		$http.get('/api/consumptionPerDevice').then(function(response) {
			var apiDataPoints = response.data;
			
			var uiDataPoints = {
				x:[],
				y:[]
			};
			let bgcolor = [];
			let hoverbgcolor = [];
			let chartColors = {
				blue: 'rgb(54, 162, 235)',
				red: 'rgb(210, 35, 60)',
				green: 'rgb(75, 192, 192)',
				yellow: 'rgb(255, 205, 86)',
				orange: 'rgb(255, 159, 64)',
				grey: 'rgb(231,233,237)',
				purple: 'rgb(153, 102, 255)',
			};
			apiDataPoints.forEach(function (item, index) {
				uiDataPoints.x.push(item.consumption.toFixed(2));
				uiDataPoints.y.push(item.name.toUpperCase());
				
				let r = Math.floor(Math.random() * (250+160))-160;
				let g = Math.floor(Math.random() * 50);
				let b = Math.floor(Math.random() * (250+200)-200);
				// let a = Math.random();
				// red > 150 b < 200 not wanted colors
				bgcolor.push(Object.values(chartColors)[index]);
			});

			var ctx = document.getElementById("deviceConsumptionChart");
			var deviceConsumptionChart = new Chart(ctx, {
				type: 'doughnut',
				data: {
					labels: uiDataPoints.y,
					datasets: [{
						label: 'Consumo horário hoje (h/d x Wh)',
						data: uiDataPoints.x,
						backgroundColor: bgcolor,
						borderWidth: 3
					}]
				},
				options: {
				}
			});
		});
	}

	statsController.getUsagePerDay = function(){
		$http.get('/api/usagePerDay').then(function(response) {
			statsController.usagePerDay = response.data;
		});
	}

}]);