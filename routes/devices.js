const express = require('express');
const router = express.Router();

// Device Model
let Device = require('../models/device');
// Article Model
let Article = require('../models/article');
// User Model
let User = require('../models/user');

// Device root Route
router.get('/', function(req, res){
  Device.
    find({}).
    // where('created_at').
    // gt(1505440700000).lt(1505440900000).
    exec(function(err, devices){
      if(err){
        console.log(err);
      } else {
        // console.log(devices);
        res.render('devices', {
          title:'Devices',
          devices: devices
        });
      }
    });
});

// Get by id
router.get('/:id', function(req, res){
  Device.findById(req.params.id, function(err, device){
    res.json(device);
  });
});

// Add Route
router.get('/add', ensureAuthenticated, function(req, res){
  res.render('add_device', {
    title:'Add Device'
  });
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

// Update Submit POST Route
// router.post('/edit/:id', function(req, res){
//   let device = {};
//   device.name = req.body.name;
//   device.description = req.body.description;

//   let query = {_id:req.params.id}

//   Device.update(query, device, function(err){
//     if(err){
//       console.log(err);
//       return;
//     } else {
//       req.flash('success', 'Device Updated');
//       res.redirect('/');
//     }
//   });
// });

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
  Device.update({_id:req.body.id}, {sync:req.body.sync}, function(err){
    if(err){
      console.log(err);
      res.sendStatus(500);
      return;
    } else {
      res.sendStatus(200);
    }
  });
});

// Delete Article
router.delete('/:id', function(req, res){
  // if(!req.user._id){
  //   res.status(500).send();
  // }

  let query = {_id:req.params.id}

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
});

// Get Single Article
// router.get('/:id', function(req, res){
//   Article.findById(req.params.id, function(err, article){
//     User.findById(article.author, function(err, user){
//       res.render('article', {
//         article:article,
//         author: user.name
//       });
//     });
//   });
// });

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
