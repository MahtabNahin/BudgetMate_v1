const pool = require('../config/db');

exports.detectRecurring = async (req, res) => {
  try {
    const [transactions] = await pool.query(
      `SELECT t.*, c.name AS category_name FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense'
       ORDER BY t.category_id, t.txn_date`,
      [req.user.id]
    );

    const byCategory = {};
    transactions.forEach((t) => {
      if (!byCategory[t.category_id]) byCategory[t.category_id] = [];
      byCategory[t.category_id].push(t);
    });

    const candidates = [];
    for (const categoryId in byCategory) {
      const txns = byCategory[categoryId];
      const clusters = [];
      txns.forEach((t) => {
        const amount = Number(t.amount);
        const day = new Date(t.txn_date).getDate();
        let matched = false;
        for (const cluster of clusters) {
          const avgAmount = cluster.reduce((s, c) => s + Number(c.amount), 0) / cluster.length;
          const avgDay = cluster.reduce((s, c) => s + new Date(c.txn_date).getDate(), 0) / cluster.length;
          if (Math.abs(amount - avgAmount) / avgAmount <= 0.05 && Math.abs(day - avgDay) <= 3) {
            cluster.push(t);
            matched = true;
            break;
          }
        }
        if (!matched) clusters.push([t]);
      });

      clusters.forEach((cluster) => {
        const distinctMonths = new Set(
          cluster.map((t) => new Date(t.txn_date).toISOString().slice(0, 7))
        );
        if (distinctMonths.size >= 2) {
          const avgAmount = Math.round(cluster.reduce((s, c) => s + Number(c.amount), 0) / cluster.length);
          const avgDay = Math.round(cluster.reduce((s, c) => s + new Date(c.txn_date).getDate(), 0) / cluster.length);
          candidates.push({
            category_id: Number(categoryId),
            category_name: cluster[0].category_name,
            avg_amount: avgAmount,
            day_of_month: avgDay,
            occurrences: cluster.length,
            months_seen: distinctMonths.size,
          });
        }
      });
    }

    res.json(candidates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.confirmRecurring = async (req, res) => {
  try {
    const { category_id, amount, day_of_month } = req.body;
    if (!category_id || !amount || !day_of_month) {
      return res.status(400).json({ message: 'category_id, amount, and day_of_month are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO recurring_transactions (user_id, category_id, amount, day_of_month) VALUES (?, ?, ?, ?)',
      [req.user.id, category_id, amount, day_of_month]
    );
    res.status(201).json({ id: result.insertId, message: 'Recurring transaction saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getRecurring = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, c.name AS category_name FROM recurring_transactions r
       JOIN categories c ON r.category_id = c.id
       WHERE r.user_id = ? AND r.is_active = TRUE`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteRecurring = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM recurring_transactions WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json({ message: 'Recurring transaction removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
