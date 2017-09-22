const express = require('express');
const router = express.Router();

module.exports = (agendash) => {
router.get('/', function(req, res){
    res.render('automation');
  });

router.get('/api', function (req, res, next) {
  agendash.api(req.query.job, req.query.state, function (err, apiResponse) {
    if (err) return res.status(400).json(err)
    res.json(apiResponse)
  })
})

router.post('/api/jobs/requeue', function (req, res, next) {
  agendash.requeueJobs(req.body.jobIds, function (err, newJobs) {
    if (err || !newJobs) return res.status(404).json(err)
    res.json(newJobs)
  })
})

router.post('/api/jobs/delete', function (req, res, next) {
  agendash.deleteJobs(req.body.jobIds, function (err, deleted) {
    if (err) return res.status(404).json(err)
    return res.json({deleted: true})
  })
})

router.post('/api/jobs/create', function (req, res, next) {
  agendash.createJob(req.body.jobName, req.body.jobSchedule, req.body.jobRepeatEvery, req.body.jobData, function (err, deleted) {
    if (err) return res.status(404).json(err)
    return res.json({created: true})
  })
})

  return router;
}
// module.exports = router;