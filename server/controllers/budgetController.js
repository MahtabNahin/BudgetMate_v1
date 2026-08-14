const pool = require('../config/db');

exports.getBudgets = async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    const [budgets] = await pool.query(
      `SELECT b.*, c.name AS category_name FROM budgets b
       JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = ? AND b.month_year = ?`,
      [req.user.id, month]
    );

    const results = await Promise.all(
      budgets.map(async (b) => {
        const [[spendRow]] = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) AS spent FROM transactions
           WHERE user_id = ? AND category_id = ? AND type = 'expense'
           AND DATE_FORMAT(txn_date, '%Y-%m') = ?`,
          [req.user.id, b.category_id, month]
        );
        const spent = Number(spendRow.spent);
        const limit = Number(b.limit_amount);
        return {
          ...b,
          spent,
          percent_used: limit > 0 ? Math.round((spent / limit) * 100) : 0,
          status: spent >= limit ? 'exceeded' : spent >= limit * 0.8 ? 'warning' : 'ok',
        };
      })
    );

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.setBudget = async (req, res) => {
  try {
    const { category_id, month_year, limit_amount } = req.body;
    if (!category_id || !month_year || !limit_amount) {
      return res.status(400).json({ message: 'category_id, month_year, and limit_amount are required' });
    }

    await pool.query(
      `INSERT INTO budgets (user_id, category_id, month_year, limit_amount)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE limit_amount = VALUES(limit_amount)`,
      [req.user.id, category_id, month_year, limit_amount]
    );

    res.status(201).json({ message: 'Budget saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM budgets WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Budget not found' });

    await pool.query('DELETE FROM budgets WHERE id = ?', [id]);
    res.json({ message: 'Budget deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
