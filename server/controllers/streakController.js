const pool = require('../config/db');

exports.getStreaks = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, c.name AS category_name FROM streaks s
       JOIN categories c ON s.category_id = c.id
       WHERE s.user_id = ?`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBadges = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM badges WHERE user_id = ? ORDER BY earned_date DESC', [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Recalculate streaks for a completed month: call this for a past month_year (e.g. '2026-07')
// to check if the user stayed under budget in each category and update streak counts.
exports.evaluateMonth = async (req, res) => {
  try {
    const { month_year } = req.body;
    if (!month_year) return res.status(400).json({ message: 'month_year is required' });

    const [budgets] = await pool.query(
      'SELECT * FROM budgets WHERE user_id = ? AND month_year = ?',
      [req.user.id, month_year]
    );

    const awarded = [];

    for (const budget of budgets) {
      const [[spendRow]] = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS spent FROM transactions
         WHERE user_id = ? AND category_id = ? AND type = 'expense' AND DATE_FORMAT(txn_date, '%Y-%m') = ?`,
        [req.user.id, budget.category_id, month_year]
      );
      const spent = Number(spendRow.spent);
      const stayedUnderBudget = spent <= Number(budget.limit_amount);

      const [existing] = await pool.query(
        'SELECT * FROM streaks WHERE user_id = ? AND category_id = ?',
        [req.user.id, budget.category_id]
      );

      if (stayedUnderBudget) {
        if (existing.length === 0) {
          await pool.query(
            'INSERT INTO streaks (user_id, category_id, current_streak, longest_streak, last_success_month) VALUES (?, ?, 1, 1, ?)',
            [req.user.id, budget.category_id, month_year]
          );
        } else {
          const s = existing[0];
          const newStreak = s.current_streak + 1;
          const newLongest = Math.max(newStreak, s.longest_streak);
          await pool.query(
            'UPDATE streaks SET current_streak = ?, longest_streak = ?, last_success_month = ? WHERE id = ?',
            [newStreak, newLongest, month_year, s.id]
          );

          if ([3, 6, 12].includes(newStreak)) {
            await pool.query(
              'INSERT INTO badges (user_id, badge_type, earned_date) VALUES (?, ?, CURDATE())',
              [req.user.id, `${newStreak}-month streak in a category`]
            );
            awarded.push(`${newStreak}-month streak badge`);
          }
        }
      } else if (existing.length > 0) {
        await pool.query('UPDATE streaks SET current_streak = 0 WHERE id = ?', [existing[0].id]);
      }
    }

    res.json({ message: 'Month evaluated', badges_awarded: awarded });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
