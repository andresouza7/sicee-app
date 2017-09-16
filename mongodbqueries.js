// Mongodb queries for the project

// Get telemetry for device with id 1 and sort in reverse
query = "db.getCollection('DevicesTelemetry').find({device_id:1}).sort({timestamp:-1})"

// Get telemetry for device with id withing time range
query = "db.getCollection('DevicesTelemetry').find({timestamp:{$gt:4,$lt:20}})"
// $gt=greater than, $lt=less than, $gte $lte = grear/less or equal

// COMBINE NESTED ELEMENT AND FILTER BY
query = "db.getCollection('DevicesTelemetry').find({device_id:2,'telemetry.power':{$gt:1000,$lt:1700}})"

// COMBINE NESTED ELEMENT AND FILTER BY AND SUPRESS KEY
query = "db.getCollection('DevicesTelemetry').find({device_id:2,'telemetry.power':{$gt:1000,$lt:1700}},{device_id:0})"

// Filter nested element
query = "db.getCollection('Telemetry').find({'Total.power':70})"

// Limit number of restults
query = "db.getCollection('Telemetry').find({'Total.power':70}).limit(1)"