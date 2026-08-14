const pool = require('../config/db');

// Predict month-end spend per category based on current daily burn rate
exports.getPredictions = async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const [year, mon] = month.split('-').map(Number);
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === mon;
    const dayOfMonth = isCurrentMonth ? today.getDate() : new Date(year, mon, 0).getDate();
    const daysInMonth = new Date(year, mon, 0).getDate();

    const [rows] = await pool.query(
      `SELECT c.id AS category_id, c.name AS category_name, SUM(t.amount) AS spent_so_far
       FROM transactions t JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense' AND DATE_FORMAT(t.txn_date, '%Y-%m') = ?
       GROUP BY c.id, c.name`,
      [req.user.id, month]
    );

    const predictions = rows.map((r) => {
      const dailyRate = Number(r.spent_so_far) / dayOfMonth;
      const projected = Math.round(dailyRate * daysInMonth);
      return {
        category_id: r.category_id,
        category_name: r.category_name,
        spent_so_far: Number(r.spent_so_far),
        projected_month_end: projected,
      };
    });

    res.json(predictions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Flag unusually large transactions per category using mean + standard deviation
exports.getAnomalies = async (req, res) => {
  try {
    const [transactions] = await pool.query(
      `SELECT t.*, c.name AS category_name FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense'`,
      [req.user.id]
    );

    const byCategory = {};
    transactions.forEach((t) => {
      if (!byCategory[t.category_id]) byCategory[t.category_id] = [];
      byCategory[t.category_id].push(t);
    });

    const anomalies = [];
    for (const categoryId in byCategory) {
      const txns = byCategory[categoryId];
      if (txns.length < 4) continue; // not enough data to judge

      const amounts = txns.map((t) => Number(t.amount));
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);

      txns.forEach((t) => {
        if (Number(t.amount) > mean + 2 * stdDev) {
          anomalies.push({
            id: t.id,
            category_name: t.category_name,
            amount: Number(t.amount),
            txn_date: t.txn_date,
            category_average: Math.round(mean),
          });
        }
      });
    }

    res.json(anomalies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Data for the what-if simulator: average monthly spend per category over last N months
exports.getSimulatorBaseline = async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const [rows] = await pool.query(
      `SELECT c.id AS category_id,
              c.name AS category_name,
              SUM(t.amount) AS total,
              COUNT(DISTINCT DATE_FORMAT(t.txn_date, '%Y-%m')) AS months,
              COALESCE(SUM(CASE
                WHEN DATE_FORMAT(t.txn_date, '%Y-%m') = ? THEN t.amount
                ELSE 0
              END), 0) AS current_month_spend
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense'
       GROUP BY c.id, c.name
       HAVING current_month_spend > 0
       ORDER BY total DESC`,
      [currentMonth, req.user.id]
    );

    const baseline = rows.map((r) => {
      const avgMonthlySpend = Math.round(
        Number(r.total) / Math.max(Number(r.months), 1)
      );

      const currentMonthSpend = Number(r.current_month_spend || 0);

      return {
        category_id: r.category_id,
        category_name: r.category_name,
        avg_monthly_spend: avgMonthlySpend,
        current_month_spend: currentMonthSpend,
        simulation_spend: currentMonthSpend,
      };
    });

    const [[currentTotals]] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
       FROM transactions
       WHERE user_id = ?
         AND DATE_FORMAT(txn_date, '%Y-%m') = ?`,
      [req.user.id, currentMonth]
    );

    const currentIncome = Number(currentTotals?.income || 0);
    const currentExpense = Number(currentTotals?.expense || 0);

    res.json({
      baseline,
      current_month: currentMonth,
      current_month_income: currentIncome,
      current_month_expense: currentExpense,
      current_month_savings: currentIncome - currentExpense,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
