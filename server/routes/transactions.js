const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
  getTransactions, createTransaction, updateTransaction, deleteTransaction, getSummary,
} = require('../controllers/transactionController');

router.use(authenticate);
router.get('/', getTransactions);
router.get('/summary', getSummary);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
