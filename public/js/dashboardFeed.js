function testWebSocket() {
  alert('WebSocket Message');
}

function testSchedule() {
  alert('Schedule message');
}

// ===========================================================================================
// RF TELEMETRY PAGE DATA UPDATE

function updateRfTelemetryData() {
  $.get("/api/rftelemetry", function(data, status){
    document.body.innerHTML=JSON.stringify(data);
    // $.each(data, function(idx, elem){
    //   document.write(data);
    // });
  });
}

$(document).ready(function(){
  var path = window.location.pathname;
  if (path == '/rftelemetry') {
    // UPDATE ON DATA CHANGE
    setInterval(function(){
      // this will run after every 5 seconds
      updateRfTelemetryData();
    }, 1000);
  }
});

// ===========================================================================================
// TELEMETRY PAGE DATA UPDATE
// GLOBAL VARIABLES

function updateTelemetryData() {
  const devId = $('#select-devices').val();
  var get_url = '';
  if (devId != "Todos os dispositivos") {
    get_url = "/api/telemetry?deviceId="+devId;
    // alert(get_url);
  } else {
    get_url = "/api/telemetry";
  }
  var telemetry_samples = 0;
  $.get(get_url, function(data, status){
    var table = $("#telemetry-data tbody");
    $.each(data, function(idx, elem){
        telemetry_samples++;
        table.prepend("<tr><td>"+elem.deviceId+"</td><td>"+elem.power.toFixed(1)+"</td><td>"+elem.voltage+"</td><td>"+elem.current+"</td><td>"+elem.timestamp+"</td></tr>");
    });
    $("#telemetry-data").find("tr:gt("+telemetry_samples+")").remove();
  });
}

$(document).ready(function(){
  var path = window.location.pathname;
  if (path == '/telemetry') {
    // LOAD ONCE WHEN PAGE OPENS
    // Get devices names and show in dropdown menu
    $.get("/api/devices", function(devices, status){
      var options = $("#select-devices");
      devices.forEach(function(device,index){
        options.append($("<option />").val(device.deviceId).text(device.name));
      });
    }); 
    updateTelemetryData();
    // UPDATE ON DATA CHANGE
    setInterval(function(){
      // this will run after every 5 seconds
      updateTelemetryData();
    }, 2000);
  }
});

// ===========================================================================================
// CONTROL PAGE SETUP
// GLOBAL VARIABLES

function updateStateOn(id) {
  var url = "/api/devices/state/update/on?id="+id;
  $.get(url, function(data, status){
   
  });
}

function updateStateOff(id) {
  var url = "/api/devices/state/update/off?id="+id;
  $.get(url, function(data, status){
   
  });
}

$(document).ready(function(){
  var path = window.location.pathname;
  if (path == '/control' || path == '/schedule') {
    // LOAD ONCE WHEN PAGE OPENS
    // Get devices names and show in dropdown menu
    $.get("/api/devices", function(devices, status){
      $(document).on('change', '[type=checkbox]', function() {
        if($(this).is(":checked")) {
          updateStateOn($(this).attr("value"));
        } else {
          updateStateOff($(this).attr("value"));
        }
        
      }); 

      devices.forEach(function(device,index){
        var box = $(document.createElement('div'));
        var cardbox = $(document.createElement('div')).attr({
          class: 'card',
          style: "width: 12rem"
        });
        var cardbody = $(document.createElement('div')).attr({
          class: 'card-body'
        });
        box.append(cardbox);
        cardbox.append(cardbody);
        cardbody.append($('<div></div>',{text:device.name}));
        // cardbody.append($('<label>',{text:device.current_state}));
        // cardbody
        // .append(
        //   $(document.createElement('input')).attr({
        //     id:  device.deviceId
        //     ,class: 'device'
        //     ,name: 'device'
        //     ,value: 'on'
        //     ,type:  'submit'
        //     ,onclick: 'updateStateOn('+device.deviceId+')'
        //   })
        // );
        // cardbody
        // .append(
        //   $(document.createElement('input')).attr({
        //     id:  device.deviceId
        //     ,class: 'device'
        //     ,name: 'device'
        //     ,value: 'off'
        //     ,type:  'submit'
        //     ,onclick: 'updateStateOff('+device.deviceId+')'
        //   })
        // );
        if (device.current_state == 'on')
          cardbody.append($('<br><div><label class="switch"><input type="checkbox" checked="true" value="'+device.deviceId+'"><span class="slider round"></span></label></div>'));
        if (device.current_state == 'off')
        cardbody.append($('<br><div><label class="switch"><input type="checkbox" value="'+device.deviceId+'"><span class="slider round"></span></label></div>'));
        // cardbody.append($('<hr>'));
        cardbody.append($('<label>',{text:device.description}));
        $('#select-devices').append(box);
      });
    }); 
    // $('#select-devices').on('click','.device',function() {
    //   alert($($("#01").text()));
    // });
  }
});

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

function updateDashboardData() {
  $.get("/api/totalpower", function(data, status){
    // alert("Data: " + data + "\nStatus: " + status);
    document.getElementById("value_totalpower").innerHTML = data.power.toFixed(2)+" W";
  }); 
  $.get("/api/totalconsumption", function(data, status){
      // alert("Data: " + data + "\nStatus: " + status);
      // document.getElementById("value_totalconsumption").innerHTML = (data/1000.0).toFixed(2)+' kWh';
      document.getElementById("value_totalconsumption").innerHTML = 142.6 + ' kWh';
      // document.getElementById("value_currentbill").innerHTML = 'R$ '+(data*0.4/1000.0).toFixed(2);
  }); 
  
}

$(document).ready(function(){
  var path = window.location.pathname;
  if (path == '/') {
    // LOAD ONCE WHEN PAGE OPENS
    updateDashboardData();
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
    
    $.get("/api/deviceconsumption", function(data, status){
      let xpoints = [];
      let labels =[];
      data.forEach(function(item){
        xpoints.unshift(item.total);
        labels.unshift(item._id);
      });
      weeklyConsumptionPerDeviceChart("chart2", xpoints, labels);
  });
    // UPDATE ON DATA CHANGE
    setInterval(function(){
      // this will run after every 5 seconds
      updateDashboardData();
    }, 2000);
  }  
});

function weeklyConsumptionChart(container,labels,data) {
  var myChart = new Chart(container, {
    type: 'bar',
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

function weeklyConsumptionPerDeviceChart(container, datapoints, datalabels) {
  var data = {
    datasets: [{
      label: "Consumo por medidor",
      data: datapoints
    }],
    // These labels appear in the legend and in the tooltips when hovering different arcs
    labels: datalabels
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




