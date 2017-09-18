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

// $(document).ready(function(){
//   $('.test').on('click', function(e){
//     alert('jskdf');
//   });
// });

// LISTENING TO EVENT IN SOCKET IO
$(function () {
    var socket = io();
    $('.test').on('click', function(e){
      socket.emit('chat message', 'testing...');
    });
    socket.on('chat message', function(msg){
      alert('New data from server:<br>'+msg);
    });
  });

// $('#m').val()