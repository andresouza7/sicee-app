var myApp = angular.module('myApp');

myApp.controller('StatisticsController', ['$scope', '$interval','$http', '$location', '$routeParams', function($scope, $interval, $http, $location, $routeParams){
	console.log('StatisticsController loaded...');

	statsController = this;

	statsController.getMonthConsumption = function(){
		$http.get('/api/totalconsumptionforperiod').then(function(response) {
			statsController.consumption = response.data;
			let datenow = new Date(Date.now());
			var daysOfMonth = new Date(datenow.getFullYear(),datenow.getMonth()+1,0);

			var total = 0;
			var consToday = 0;
			statsController.consumption.forEach(function (item) {
				total += item.total;
				if (datenow.getDate() == item._id)
					consToday = item.total;
			});
			statsController.consumption.lentgh;
			statsController.avg = total/statsController.consumption.length;
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
				bgcolor.push('rgba(75, 234, 40, 0.5)');
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
					borderWidth: 3,
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

			var ctx = document.getElementById("totalConsChart");
			var totalConsChart = new Chart(ctx, {
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

	statsController.getDeviceConsumption = function(){
		$http.get('/api/deviceconsumptionforperiod').then(function(response) {
			statsController.device_consumption = response.data;
			
			var datapoints = {
				x:[],
				y:[]
			};
			var bgcolor = [];
			for (let hour=0; hour<=23; hour++){
				statsController.device_consumption.forEach(function (item) {
					if (item._id == hour) {
						datapoints.x.push(item.total.toFixed(2));
						let bin = item._id+1;
						datapoints.y.push(item._id+"-"+bin);
						bgcolor.push('rgba(75, 192, 230, 0.4)');
					}	
				});
			}

			var ctx = document.getElementById("deviceConsChart");
			var deviceConsChart = new Chart(ctx, {
				type: 'bar',
				data: {
					labels: datapoints.y,
					datasets: [{
						label: 'Consumo horário hoje (h/d x Wh)',
						data: datapoints.x,
						backgroundColor: bgcolor,
						borderWidth: 3
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

}]);