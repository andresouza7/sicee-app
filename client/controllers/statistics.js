var myApp = angular.module('myApp');

myApp.controller('StatisticsController', ['$scope', '$interval','$http', '$location', '$routeParams','room','socket', 
	function($scope, $interval, $http, $location, $routeParams, room, socket){
	console.log('StatisticsController loaded...');

	statsController = this;
	$scope.selectedOptionYear={year:new Date().getFullYear()};
	$scope.selectedOptionMonth={month:new Date().getMonth()};
	room.getRooms().then(function(data){
		$scope.rooms_list = data;
	});
	statsController.getMeasureId = function () {
		statsController.measureId = $routeParams.id;
	}

	var chartColors = {
		blue: 'rgb(54, 162, 235)',
		red: 'rgb(210, 35, 60)',
		green: 'rgb(75, 192, 192)',
		yellow: 'rgb(255, 205, 86)',
		orange: 'rgb(255, 159, 64)',
		grey: 'rgb(231,233,237)',
		purple: 'rgb(153, 102, 255)',
	};
	
	// socket.on('telemetry', function (data) {
	// 	statsController.getConsumptionPerHourMonthly();
	// });

	statsController.getConsumptionPerHourMonthly = function(){
		if (!$scope.selectedOptionMonth)
			$scope.selectedOptionMonth = $scope.selectedOptionYear.months[0];
		var period = {
			year: $scope.selectedOptionYear.year,
			month: $scope.selectedOptionMonth.month
		};
		// if (!statsController.measureId) alert("measure id not obtained");
		$http.get('/api/stats/'+statsController.measureId).then(function(response) {
			statsController.measure = response.data;
			draw_chart_hour();
			draw_chart_day();
			function draw_chart_day() {
				apiDataPoints = response.data.consumption_per_day;
				let datenow = new Date(Date.now());
				var daysOfMonth = new Date(datenow.getFullYear(),datenow.getMonth()+1,0);

				var datapoints = {
					x:[],
					y:[]
				};
				var avgbgcolor = [];
				var bgcolor = [];
				
				for (let i=1; i<=daysOfMonth.getDate(); i++){
					datapoints.x.push(0);
					avgbgcolor.push('rgba(0, 0, 0, 0.5)');
					bgcolor.push('rgba(75, 234, 40, 0.8)');
					datapoints.y.push(i);
					apiDataPoints.forEach(function (item) {
						if (datapoints.y[i-1]==item._id) { // _id = day of month
							datapoints.x[i-1]=item.value.toFixed(2);
						} 
					});
				}
				// {
				// 	type: 'line',
				// 	label: 'Média no mês',
				// 	fill: false,
				// 	backgroundColor: 'grey',
				// 	data: datapoints.avg,
				// 	borderColor: 'grey',
				// 	borderWidth: 2,
				// }
				var chartData = {
					labels: datapoints.y,
					datasets: [{
						type: 'bar',
						label: 'Wh por dia',
						backgroundColor: bgcolor,
						borderWidth: 2,
						fill: false,
						data: datapoints.x,
					}]
				};

				if (statsController.dailyConsumptionChart) // Prevents double chart bug
					statsController.dailyConsumptionChart.destroy();
				var ctx = document.getElementById("dailyConsumptionChart");
				statsController.dailyConsumptionChart = new Chart(ctx, {
					type: 'bar',
					data: chartData,
					options: {
						animation: false,
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
			}
			function draw_chart_hour() {
				var apiDataPointsGeneral = response.data.consumption_per_hour_total;
				var apiDataPointsDevices = response.data.consumption_per_hour_device;
				statsController.data_available = response.data ? true : false;
				// statsController.excess_consumption = response.data.excess;
				
				var generalXPoints = [];
				var datasets = [];
				var bgcolorGeneralPoints = [];
				var labels = [];
				for (let hour=0; hour<=23; hour++){
					let bin = hour+1;
					labels.push(hour+"h");
					// Fill in series for total consumption
					let generalPointExists = false;
					apiDataPointsGeneral.forEach(function (item, index) {
						if (item._id == hour) { //item._id = hour of day
							generalPointExists = true;
							generalXPoints.push(item.value.toFixed(2));
							bgcolorGeneralPoints.push(Object.values(chartColors)[0]);
							
							// let highlight = false;
							// statsController.excess_consumption.forEach(function (excess_item){
							// 	if (excess_item._id == item._id)
							// 		highlight = true;
							// });
							// if (highlight) bgcolor.push('red');
							// else bgcolor.push('rgba(75, 192, 230, 0.8)');
						}
					});
					if (!generalPointExists) {
						generalXPoints.push(0);
						bgcolorGeneralPoints.push(Object.values(chartColors)[0]);
					}
				}

				// Fill in individual series for each device
				apiDataPointsDevices.forEach(function(device, index){
					var deviceXPoints = [];
					for (let hour=0; hour<=23; hour++){
						let devicePointExists = false;
						device.consumption.forEach(function(item){
							if (item._id == hour) { //item._id = hour of day
								devicePointExists = true;
								deviceXPoints.push(item.value.toFixed(2));
							}
						});
						if (!devicePointExists) {
							deviceXPoints.push(0);
						}
					}
					// Push individual device series
					datasets.push({
						type: 'line',
						label: device.deviceName, //device name as per the api
						borderColor: Object.values(chartColors)[index+1],
						borderWidth: 2,
						data: deviceXPoints,
						fill: false
					});
				});
				// Push ALL_Devices series
				datasets.push({
					type: 'bar',
					label: 'Todos',
					backgroundColor: bgcolorGeneralPoints,
					borderWidth: 2,
					data: generalXPoints
				});

				var chartData = {
					labels: labels,
					datasets: datasets
				}

				if (statsController.hourlyConsumptionChartForMonth) // Prevents double chart bug
					statsController.hourlyConsumptionChartForMonth.destroy();
				// var ctx = document.getElementById("dailyConsumptionChart");
				var ctx = document.getElementById("hourlyConsumptionChartForMonth");
				statsController.hourlyConsumptionChartForMonth = new Chart(ctx, {
					type: 'bar',
					data: chartData,
					options: {
						animation: false,
						elements: {
							point: {
								radius: 2
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
			}
		});
	}

	statsController.getRange = function () { // Runs once when page loads
		$http.get('/api/getRange').then(function(response) {
			if (response.data.length) {
			statsController.range = response.data;
			$scope.selectedOptionYear = statsController.range[0];
			$scope.selectedOptionMonth = statsController.range[0].months[0];}
		});
	}

	statsController.getConsumptionPerDay = function(){
		if (!$scope.selectedOptionMonth)
			$scope.selectedOptionMonth = $scope.selectedOptionYear.months[0];
		var period = {
			year: $scope.selectedOptionYear.year,
			month: $scope.selectedOptionMonth.month
		};
		$http.get('/api/consumptionPerDay?year='+period.year+'&month='+period.month).then(function(response) {
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
					label: 'Wh por dia',
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

			if (statsController.dailyConsumptionChart) // Prevents double chart bug
				statsController.dailyConsumptionChart.destroy();
			var ctx = document.getElementById("dailyConsumptionChart");
			statsController.dailyConsumptionChart = new Chart(ctx, {
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
			document.getElementById("dailyConsumptionChart").onclick = function (evt) {
				var activePoints = dailyConsumptionChart.getElementsAtEventForMode(evt, 'point', dailyConsumptionChart.options);
				var firstPoint = activePoints[0];
				var label = dailyConsumptionChart.data.labels[firstPoint._index];
				var value = dailyConsumptionChart.data.datasets[firstPoint._datasetIndex].data[firstPoint._index];
				// alert(label + ": " + value);
				$('#dailyInsight').modal('show');
				statsController.getConsumptionPerHour("dailyInsightChart");
			};

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

	// statsController.getConsumptionPerHourMonthly = function(){
	// 	if (!$scope.selectedOptionMonth)
	// 		$scope.selectedOptionMonth = $scope.selectedOptionYear.months[0];
	// 	var period = {
	// 		year: $scope.selectedOptionYear.year,
	// 		month: $scope.selectedOptionMonth.month
	// 	};
	// 	$http.get('/api/consumptionPerHourMonthly?year='+period.year+'&month='+period.month).then(function(response) {
	// 		var apiDataPointsGeneral = response.data.general;
	// 		var apiDataPointsDevices = response.data.devices;
	// 		statsController.bill_stats = response.data.bill_stats;
	// 		// statsController.excess_consumption = response.data.excess;
			
	// 		var generalXPoints = [];
	// 		var datasets = [];
	// 		var bgcolorGeneralPoints = [];
	// 		var labels = [];
	// 		for (let hour=0; hour<=23; hour++){
	// 			let bin = hour+1;
	// 			labels.push(hour+"-"+bin+"h");
	// 			// Fill in series for total consumption
	// 			let generalPointExists = false;
	// 			apiDataPointsGeneral.forEach(function (item, index) {
	// 				if (item._id == hour) { //item._id = hour of day
	// 					generalPointExists = true;
	// 					generalXPoints.push(item.total.toFixed(2));
	// 					bgcolorGeneralPoints.push(Object.values(chartColors)[0]);
						
	// 					// let highlight = false;
	// 					// statsController.excess_consumption.forEach(function (excess_item){
	// 					// 	if (excess_item._id == item._id)
	// 					// 		highlight = true;
	// 					// });
	// 					// if (highlight) bgcolor.push('red');
	// 					// else bgcolor.push('rgba(75, 192, 230, 0.8)');
	// 				}
	// 			});
	// 			if (!generalPointExists) {
	// 				generalXPoints.push(0);
	// 				bgcolorGeneralPoints.push(Object.values(chartColors)[0]);
	// 			}
	// 		}

	// 		// Fill in individual series for each device
	// 		apiDataPointsDevices.forEach(function(device, index){
	// 			var deviceXPoints = [];
	// 			for (let hour=0; hour<=23; hour++){
	// 				let devicePointExists = false;
	// 				device.consumption.forEach(function(item){
	// 					if (item._id == hour) { //item._id = hour of day
	// 						devicePointExists = true;
	// 						deviceXPoints.push(item.total.toFixed(2));
	// 					}
	// 				});
	// 				if (!devicePointExists) {
	// 					deviceXPoints.push(0);
	// 				}
	// 			}
	// 			// Push individual device series
	// 			datasets.push({
	// 				type: 'line',
	// 				label: device.device, //device name as per the api
	// 				borderColor: Object.values(chartColors)[index+1],
	// 				borderWidth: 2,
	// 				data: deviceXPoints,
	// 				fill: false
	// 			});
	// 		});
	// 		// Push ALL_Devices series
	// 		datasets.push({
	// 			type: 'bar',
	// 			label: 'Todos',
	// 			backgroundColor: bgcolorGeneralPoints,
	// 			borderWidth: 2,
	// 			data: generalXPoints
	// 		});

	// 		var chartData = {
	// 			labels: labels,
	// 			datasets: datasets
	// 		}

	// 		if (statsController.hourlyConsumptionChartForMonth) // Prevents double chart bug
	// 			statsController.hourlyConsumptionChartForMonth.destroy();
	// 		var ctx = document.getElementById("dailyConsumptionChart");
	// 		var ctx = document.getElementById("hourlyConsumptionChartForMonth");
	// 		statsController.hourlyConsumptionChartForMonth = new Chart(ctx, {
	// 			type: 'bar',
	// 			data: chartData,
	// 			options: {
	// 				elements: {
	// 					point: {
	// 						radius: 2
	// 					}
	// 				},
	// 				scales: {
	// 					yAxes: [{
	// 						ticks: {
	// 							beginAtZero:true
	// 						}
	// 					}]
	// 				}
	// 			}
	// 		});
	// 	});
	// }

	statsController.getConsumptionPerDevice = function(){
		$http.get('/api/consumptionPerDevice').then(function(response) {
			var apiDataPoints = response.data;
			
			var uiDataPoints = {
				x:[],
				y:[]
			};
			let bgcolor = [];
			let hoverbgcolor = [];
			
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