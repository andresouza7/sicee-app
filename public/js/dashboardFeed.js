function testWebSocket() {
  alert('WebSocket Message');
}

function testSchedule() {
  alert('Schedule message');
}

// ===========================================================================================
// DEVICES PAGE FUNCTIONS
// GLOBAL VARIABLES

$(document).ready(function(){
  $('.delete-article').on('click', function(e){
    $target = $(e.target);
    const id = $target.attr('data-id');
    $.ajax({
      type:'DELETE',
      url: '/articles/'+id,
      success: function(response){
        alert('Deleting Article');
        window.location.href='/';
      },
      error: function(err){
        console.log(err);
      }
    });
  });
});

$(document).ready(function(){
  $('.delete-device').on('click', function(e){
    $target = $(e.target);
    const id = $target.attr('data-id');
    $.ajax({
      type:'DELETE',
      url: '/devices/'+id,
      success: function(response){
        alert('Deleting device');
        window.location.href='/';
      },
      error: function(err){
        console.log(err);
      }
    });
  });
});

// ===========================================================================================
// DASHBOARD PAGE DATA UPDATE
// GLOBAL VARIABLES


function updateData() {
  $.get("/api/totalpower", function(data, status){
    // alert("Data: " + data + "\nStatus: " + status);
    document.getElementById("value_totalpower").innerHTML = data.power.toFixed(2)+" W";
  }); 
  $.get("/api/totalconsumption", function(data, status){
      // alert("Data: " + data + "\nStatus: " + status);
      document.getElementById("value_totalconsumption").innerHTML = (data/1000.0).toFixed(2)+' kWh';
      document.getElementById("value_currentbill").innerHTML = 'R$ '+(data*0.4/1000.0).toFixed(2);
  }); 
  
}

  $(document).ready(function(){
    var path = window.location.pathname;
    if (path == '/') {
    // LOAD ONCE WHEN PAGE OPENS
    updateData();
    $.get("/api/totalpowerforperiod", function(data, status){
        // alert("power: " + data[0].power + "\nTimestamp: " + data[0].timestamp);
        let xpoints = [];
        let labels =[];
        var datapoints = [];
        data.forEach(function(item){
          xpoints.unshift(item.power);
          let timestamp = new Date(item.timestamp);
          labels.unshift(timestamp.getHours()+":"+timestamp.getMinutes()+":"+timestamp.getSeconds());
          datapoints.push({x: new Date(item.timestamp), y: item.power});
        });
        weeklyConsumptionChart("chart1",labels,xpoints);
    }); 
    // UPDATE ON DATA CHANGE
    setInterval(function(){
      // this will run after every 5 seconds
      updateData();
    }, 3000);
    }  
});

function weeklyConsumptionChart(container,labels,data) {
  var myChart = new Chart(container, {
    type: 'line',
    data: {
          labels: labels,
          datasets: [{
              label: 'Histórico de consumo',
              data: data,
              borderWidth: 1
          }]
      },
      options: {
        noAnimation: true,
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

function weeklyConsumptionChartTime(container,datapoints) {
  var myTimeChart = new Chart(container, {
    type: 'line',
    data: datapoints,
      options: {
        scales: {
          yAxes: [{
            ticks: {
              beginAtZero:true
            }
          }],
          xAxes: [{
                type: 'time',
                time: {
                    displayFormats: {
                        quarter: 'MMM YYYY'
                    }
                }
            }]
        }
      }
  });
}

function weeklyConsumptionPerDeviceChart(container) {
  var data = {
    datasets: [{
      label: "Consumo por medidor",
      data: [10, 20, 30]
    }],

    // These labels appear in the legend and in the tooltips when hovering different arcs
    labels: [
        'Medidor 1',
        'Medidor 2',
        'Medidor 3'
    ]
  };
    var myPieChart = new Chart(container,{
      type: 'pie',
      data: data
  });
}


// ===========================================================================================

// LISTENING TO EVENT IN SOCKET IO
$(function () {
    var socket = io();
    $('.test').on('click', function(e){
      socket.emit('chat message', 'testing...');
    });
    socket.on('notification', function(msg){
      alert('New data from server:<br>'+msg);
    });
  });

// $('#m').val()




