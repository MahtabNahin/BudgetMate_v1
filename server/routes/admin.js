const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const { getOverview, getUsers } = require('../controllers/adminController');

router.use(authenticate, adminOnly);
router.get('/overview', getOverview);
router.get('/users', getUsers);

module.exports = router;
