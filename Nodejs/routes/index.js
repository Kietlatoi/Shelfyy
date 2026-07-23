var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.json({
    service: 'shelfy-node',
    status: 'ok',
  });
});

module.exports = router;
