const express = require('express');
const router = express.Router();

// Device Model
let Device = require('../models/device');
// User Model
let User = require('../models/user');
// Telemetry Model
var Telemetry = require('../models/telemetry');
// Consumption Model
var Consumption = require('../models/consumption');
// Economy rule Model
var EconomyRule = require('../models/economy_rule');

// Get by id
router.get('/:id', function(req, res){
  Device.findById(req.params.id, function(err, device){
    res.json(device);
  });
});

// Filter by text
router.get('/search/:device_name', function(req, res){
  let filter = '/'+req.params.device_name+'/';
  console.log(filter);
  var getValue='abc';
  var regexValue='\.*'+req.params.device_name+'\.';
 
  Device.find({"name":new RegExp(regexValue, 'i')} , {_id:1,name:1},function(err, device){
    if (device) {
    res.json(device);
    console.log(device);
    }
    else res.sendStatus(500);
  });
  // res.sendStatus(200);
});

// Add Submit POST Route
router.post('/add', function(req, res){
  let device = new Device();
  device.name = req.body.name;

  device.save(function(err){
    if(err){
      console.log(err);
      res.sendStatus(500);
      return;
    } else {
      Device.find({name:device.name}).exec(function (err, device){
        if (err) {
          res.sendStatus(500);
        } else {
          res.json(device);
        }
      });
    }
  });
});

// Load Edit Form
router.get('/edit/:id', ensureAuthenticated, function(req, res){
  Device.findById(req.params.id, function(err, device){
    res.render('edit_device', {
      title:'Edit Device',
      device:device
    });
  });
});

router.put('/:_id', function(req, res){
  console.log(req.body);
  let device = {};
  device.name = req.body.name;
  device.description = req.body.description;

  let query = {_id:req.params._id}

  Device.update(query, device, function(err){
    if(err){
      console.log(err);
      return;
    } else {
      req.flash('success', 'Device Updated');
      res.sendStatus(200);
    }
  });
});

// RF TETHER
router.post('/sync/', function(req, res){
  console.log(req.body);
  if (req.body.sync == true) {
    Device.update({_id:req.body.id}, {sync:req.body.sync}, function(err){
      if(err){
        console.log(err);
        res.sendStatus(500);
        return;
      } else {
        res.sendStatus(200);
      }
    });
  } else if (req.body.sync == false) {
    Device.update({_id:req.body.id}, {pipe:''}, function(err){
      if (err) console.log(err);
      res.sendStatus(200);
    });
  }
});

// Delete Article
router.delete('/:id', function(req, res){
  // if(!req.user._id){
  //   res.status(500).send();
  // }

  let query = {_id:req.params.id}
  let id = req.params.id;
  Device.findById(req.params.id, function(err, device){
    // Configure for example to only allow changes
    // if account has admin privileges

    // if(article.author != req.user._id){
    //   res.status(500).send();
    // } else {
      Device.remove(query, function(err){
        if(err){
          console.log(err);
        }
        res.send('Success');
      });
    // }
  });
  Telemetry.remove({deviceId: id},function(err,response){});
  Consumption.remove({deviceId: id},function(err,response){});
  EconomyRule.remove({deviceId: id},function(err,response){});
});

// Access Control
function ensureAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    return next();
  } else {
    req.flash('danger', 'Please login');
    res.redirect('/users/login');
  }
}

module.exports = router;
