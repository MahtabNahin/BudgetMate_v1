const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { getAlerts, markRead, markAllRead, dismissAlert } = require('../controllers/alertsController');

router.use(authenticate);
router.get('/', getAlerts);
router.post('/read-all', markAllRead);
router.post('/:key/read', markRead);
router.post('/:key/dismiss', dismissAlert);

module.exports = router;
