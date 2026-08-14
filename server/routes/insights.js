const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
  getPredictions, getAnomalies, getSimulatorBaseline,
} = require('../controllers/insightsController');

router.use(authenticate);
router.get('/predictions', getPredictions);
router.get('/anomalies', getAnomalies);
router.get('/simulator-baseline', getSimulatorBaseline);

module.exports = router;
