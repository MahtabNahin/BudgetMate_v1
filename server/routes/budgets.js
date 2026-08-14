const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { getBudgets, setBudget, deleteBudget } = require('../controllers/budgetController');

router.use(authenticate);
router.get('/', getBudgets);
router.post('/', setBudget);
router.delete('/:id', deleteBudget);

module.exports = router;
