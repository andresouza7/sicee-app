// Mongodb queries for the project

// Get telemetry for device with id 1 and sort in reverse
db.getCollection('DevicesTelemetry').find({device_id:1}).sort({timestamp:-1})

// Get telemetry for device with id withing time range
db.getCollection('DevicesTelemetry').find({timestamp:{$gt:4,$lt:20}})
// $gt=greater than, $lt=less than, $gte $lte = grear/less or equal

// COMBINE NESTED ELEMENT AND FILTER BY
db.getCollection('DevicesTelemetry').find({device_id:2,'telemetry.power':{$gt:1000,$lt:1700}})

// COMBINE NESTED ELEMENT AND FILTER BY AND SUPRESS KEY
db.getCollection('DevicesTelemetry').find({device_id:2,'telemetry.power':{$gt:1000,$lt:1700}},{device_id:0})

// Filter nested element
db.getCollection('telemetry').find({'Total.power':70})

// Limit number of restults
db.getCollection('telemetry').find({'Total.power':70}).limit(1)

// Sum all consumption, no filters
db.getCollection('consumption').aggregate([{$group:{_id:null,total:{$sum:"$consumption"}}}])

// Sum total comsumption within time range
db.getCollection('consumption').aggregate([{$match:{timestamp:{$gte:1505672394124,$lte:1505672406063}}},{$group:{_id:null,total:{$sum:"$consumption"}}}])

// Sum of all consumption grouped by device
db.getCollection('consumption').aggregate([{$match:{timestamp:{$gte:1505672394124,$lte:1505672406063}}},{$group:{_id:"$deviceId",total:{$sum:"$consumption"},count:{$sum:1}}}])

// Sum of all comsumption grouped by device
db.getCollection('consumption').aggregate([{$group:{_id:"$deviceId",total:{$sum:"$consumption"},count:{$sum:1}}}])

// Update multiple documents in a collection
db.getCollection('telemetry').update(
    { hour: { $eq: 27 } },
    { $set: { hour: 3 } },
    { multi: true }
 )