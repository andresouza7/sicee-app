module.exports = {
  database:'mongodb://localhost:27017/siceedb',
  // database:'mongodb://localhost:27017/test',
  // database:'admin:asc030193@ds139446.mlab.com:39446/siceeapp',

  // database:'mongodb://souzaand:$pid96sqdi@sicee-shard-00-00-zdq2s.mongodb.net:27017,sicee-shard-00-01-zdq2s.mongodb.net:27017,sicee-shard-00-02-zdq2s.mongodb.net:27017/test?ssl=true&replicaSet=sicee-shard-0&authSource=admin',
  secret: 'yoursecret'
}

// DATABASE COLLECTION STRUCTURE:
// __ siceedb 
//           |__ agendaJobs
//            __ consumption
//            __ devices
//            __ notifications
//            __ rftelemetry
//            __ settings
//            __ telemetry
//            __ totalpower
//            __ users