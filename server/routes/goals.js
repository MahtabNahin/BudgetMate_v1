const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { getGoals, createGoal, updateGoal, deleteGoal, contributeToGoal } = require('../controllers/goalController');

router.use(authenticate);
router.get('/', getGoals);
router.post('/', createGoal);
router.put('/:id', updateGoal);
router.post('/:id/contribute', contributeToGoal);
router.delete('/:id', deleteGoal);

module.exports = router;
