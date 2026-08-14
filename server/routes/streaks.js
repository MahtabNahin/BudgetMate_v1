const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { getStreaks, getBadges, evaluateMonth } = require('../controllers/streakController');

router.use(authenticate);
router.get('/', getStreaks);
router.get('/badges', getBadges);
router.post('/evaluate', evaluateMonth);

module.exports = router;
