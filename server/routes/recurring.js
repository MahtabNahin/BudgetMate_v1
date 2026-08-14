const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
  detectRecurring, confirmRecurring, getRecurring, deleteRecurring,
} = require('../controllers/recurringController');

router.use(authenticate);
router.get('/detect', detectRecurring);
router.get('/', getRecurring);
router.post('/', confirmRecurring);
router.delete('/:id', deleteRecurring);

module.exports = router;
