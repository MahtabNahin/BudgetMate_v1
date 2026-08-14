const pool = require('../config/db');

exports.getTransactions = async (req, res) => {
  try {
    const { month, category_id, type } = req.query;
    let query = `SELECT t.*, c.name AS category_name FROM transactions t
                 JOIN categories c ON t.category_id = c.id
                 WHERE t.user_id = ?`;
    const params = [req.user.id];

    if (month) {
      query += ' AND DATE_FORMAT(t.txn_date, "%Y-%m") = ?';
      params.push(month);
    }
    if (category_id) {
      query += ' AND t.category_id = ?';
      params.push(category_id);
    }
    if (type) {
      query += ' AND t.type = ?';
      params.push(type);
    }
    query += ' ORDER BY t.txn_date DESC, t.id DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const { category_id, type, amount, note, txn_date } = req.body;
    if (!category_id || !type || !amount || !txn_date) {
      return res.status(400).json({ message: 'category_id, type, amount, and txn_date are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO transactions (user_id, category_id, type, amount, note, txn_date) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, category_id, type, amount, note || null, txn_date]
    );

    res.status(201).json({ id: result.insertId, category_id, type, amount, note, txn_date });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, type, amount, note, txn_date } = req.body;

    const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Transaction not found' });

    await pool.query(
      'UPDATE transactions SET category_id = ?, type = ?, amount = ?, note = ?, txn_date = ? WHERE id = ?',
      [category_id, type, amount, note || null, txn_date, id]
    );
    res.json({ id, category_id, type, amount, note, txn_date });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Transaction not found' });

    await pool.query('DELETE FROM transactions WHERE id = ?', [id]);
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Summary for charts: income vs expense by month, and by category
exports.getSummary = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year || new Date().getFullYear();

    const [monthly] = await pool.query(
      `SELECT DATE_FORMAT(txn_date, '%Y-%m') AS month, type, SUM(amount) AS total
       FROM transactions
       WHERE user_id = ? AND YEAR(txn_date) = ?
       GROUP BY month, type
       ORDER BY month`,
      [req.user.id, targetYear]
    );

    const [byCategory] = await pool.query(
      `SELECT c.name AS category_name, t.type, SUM(t.amount) AS total
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND DATE_FORMAT(t.txn_date, '%Y-%m') = ?
       GROUP BY c.name, t.type`,
      [req.user.id, req.query.month || new Date().toISOString().slice(0, 7)]
    );

    res.json({ monthly, byCategory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
