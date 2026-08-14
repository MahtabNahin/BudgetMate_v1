const pool = require('../config/db');

function parseGoalDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const text = String(value).trim();
  if (!text) return null;

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

exports.getGoals = async (req, res) => {
  try {
    const [goals] = await pool.query('SELECT * FROM goals WHERE user_id = ? ORDER BY target_date', [req.user.id]);

    const [[surplusRow]] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense,
         COUNT(DISTINCT DATE_FORMAT(txn_date, '%Y-%m')) AS months
       FROM transactions WHERE user_id = ?`,
      [req.user.id]
    );
    const months = Math.max(Number(surplusRow.months), 1);
    const avgMonthlySurplus = (Number(surplusRow.income) - Number(surplusRow.expense)) / months;

    const enriched = goals.map((g) => {
      const now = new Date();
      const target = parseGoalDate(g.target_date);
      const created = parseGoalDate(g.created_at) || now;
      const targetDate = target || now;
      const targetAmount = Number(g.target_amount);
      const saved = Number(g.current_saved);
      const remaining = Math.max(targetAmount - saved, 0);

      const monthsLeftRaw =
        (targetDate.getFullYear() - now.getFullYear()) * 12 +
        (targetDate.getMonth() - now.getMonth());
      const monthsLeft = Math.max(monthsLeftRaw, 1);

      const requiredMonthlySaving = remaining > 0 ? remaining / monthsLeft : 0;
      const percentComplete = targetAmount > 0
        ? Math.min(100, Math.round((saved / targetAmount) * 100))
        : 0;

      const totalMonths =
        (targetDate.getFullYear() - created.getFullYear()) * 12 +
        (targetDate.getMonth() - created.getMonth());
      const elapsedMonths =
        (now.getFullYear() - created.getFullYear()) * 12 +
        (now.getMonth() - created.getMonth());
      const expectedPercent = totalMonths > 0
        ? Math.min(100, Math.max(0, Math.round((elapsedMonths / totalMonths) * 100)))
        : 0;

      let status = 'on_track';
      if (saved >= targetAmount) status = 'completed';
      else if (target && now > target && saved < targetAmount) status = 'behind';
      else if (avgMonthlySurplus <= 0 || avgMonthlySurplus < requiredMonthlySaving * 0.75) status = 'behind';
      else if (avgMonthlySurplus < requiredMonthlySaving || percentComplete + 10 < expectedPercent) status = 'slightly_behind';

      return {
        ...g,
        target_amount: targetAmount,
        current_saved: saved,
        months_left: monthsLeft,
        required_monthly_saving: Math.round(requiredMonthlySaving),
        avg_monthly_surplus: Math.round(avgMonthlySurplus),
        percent_complete: percentComplete,
        expected_percent: expectedPercent,
        status,
        on_track: status === 'on_track' || status === 'completed',
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createGoal = async (req, res) => {
  try {
    const { name, target_amount, target_date } = req.body;
    if (!name || !target_amount || !target_date) {
      return res.status(400).json({ message: 'name, target_amount, and target_date are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO goals (user_id, name, target_amount, target_date) VALUES (?, ?, ?, ?)',
      [req.user.id, name, target_amount, target_date]
    );
    res.status(201).json({ id: result.insertId, name, target_amount, target_date });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, target_amount, current_saved, target_date, status } = req.body;

    const [rows] = await pool.query('SELECT * FROM goals WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Goal not found' });

    await pool.query(
      'UPDATE goals SET name = ?, target_amount = ?, current_saved = ?, target_date = ?, status = ? WHERE id = ?',
      [name, target_amount, current_saved, target_date, status, id]
    );
    res.json({ message: 'Goal updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};



exports.contributeToGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const amount = Number(req.body.amount);
    const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'A positive amount is required' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM goals WHERE id = ? AND user_id = ? LIMIT 1',
      [id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    const goal = rows[0];
    const currentSaved = Number(goal.current_saved || 0);
    const targetAmount = Number(goal.target_amount || 0);
    const remaining = Math.max(targetAmount - currentSaved, 0);

    if (remaining <= 0) {
      return res.status(400).json({ message: 'This goal is already completed' });
    }

    const appliedAmount = Math.min(amount, remaining);
    const nextSaved = currentSaved + appliedAmount;
    const nextStatus = nextSaved >= targetAmount ? 'completed' : 'active';

    await pool.query(
      'UPDATE goals SET current_saved = ?, status = ? WHERE id = ? AND user_id = ?',
      [nextSaved, nextStatus, id, req.user.id]
    );

    res.json({
      message: 'Goal contribution added',
      id: Number(id),
      amount_added: appliedAmount,
      current_saved: nextSaved,
      target_amount: targetAmount,
      remaining: Math.max(targetAmount - nextSaved, 0),
      completed: nextSaved >= targetAmount,
      note: note || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM goals WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Goal not found' });

    await pool.query('DELETE FROM goals WHERE id = ?', [id]);
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
