const express = require('express');
const router = express.Router();

// Telemetry Model
let Telemetry = require('../models/telemetry');
// Consumption Model
let Consumption = require('../models/consumption');

router.get('/', function(req, res){
    res.render('index');
});

module.exports = router;