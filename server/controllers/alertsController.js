const pool = require('../config/db');

const getMonth = () => new Date().toISOString().slice(0, 7);
const pad = (v) => String(v).padStart(2, '0');

const TYPE_RANK = {
  budget_exceeded: 0,
  spending_increase: 1,
  goal_milestone: 2,
  budget_warning: 3,
  goal_progress: 4,
  budget_success: 5,
  savings_achievement: 6,
  all_budgets_ok: 7,
};

async function computeAlerts(userId, month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === monthNumber;
  const elapsedDays = isCurrentMonth ? now.getDate() : daysInMonth;
  const monthProgress = elapsedDays / daysInMonth;

  const previousDate = new Date(year, monthNumber - 2, 1);
  const previousMonth = `${previousDate.getFullYear()}-${pad(previousDate.getMonth() + 1)}`;

  const alerts = [];

  const [budgetRows] = await pool.query(
    `SELECT b.id, b.category_id, b.limit_amount, c.name AS category_name,
            COALESCE(SUM(CASE WHEN t.type='expense' AND DATE_FORMAT(t.txn_date,'%Y-%m') = ? THEN t.amount ELSE 0 END),0) AS spent
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     LEFT JOIN transactions t ON t.user_id = b.user_id AND t.category_id = b.category_id
     WHERE b.user_id = ? AND b.month_year = ?
     GROUP BY b.id, b.category_id, b.limit_amount, c.name`,
    [month, userId, month]
  );

  let allBudgetsOk = budgetRows.length > 0;

  for (const b of budgetRows) {
    const limit = Number(b.limit_amount || 0);
    const spent = Number(b.spent || 0);
    if (limit <= 0) continue;
    const percent = Math.round((spent / limit) * 100);

    if (percent >= 100) {
      allBudgetsOk = false;
      const over = Math.round(spent - limit);
      alerts.push({
        key: `budget_exceeded:${b.id}:${month}`,
        type: 'budget_exceeded',
        severity: 'critical',
        icon: '🔴',
        title: 'Budget Exceeded',
        message: `You've exceeded your ${b.category_name} budget by ৳${over.toLocaleString()}.`,
        detail: `Spent ৳${Math.round(spent).toLocaleString()} of a ৳${Math.round(limit).toLocaleString()} limit.`,
        action: { label: 'View Budget', to: '/budgets' },
      });
    } else if (percent >= 80) {
      allBudgetsOk = false;
      const remaining = Math.round(limit - spent);
      alerts.push({
        key: `budget_warning:${b.id}:${month}`,
        type: 'budget_warning',
        severity: 'warning',
        icon: '🟡',
        title: 'Budget Warning',
        message: `You've used ${percent}% of your ${b.category_name} budget.`,
        detail: `৳${Math.round(spent).toLocaleString()} spent, ৳${remaining.toLocaleString()} remaining.`,
        action: { label: 'View Budget', to: '/budgets' },
      });
    } else if (percent <= 50 && monthProgress >= 0.5) {
      alerts.push({
        key: `budget_success:${b.id}:${month}`,
        type: 'budget_success',
        severity: 'positive',
        icon: '🟢',
        title: 'Budget Success',
        message: `Great job! You're under your ${b.category_name} budget this month.`,
        detail: `Only ${percent}% used with ${Math.round((1 - monthProgress) * 100)}% of the month left.`,
        action: { label: 'View Budget', to: '/budgets' },
      });
    }
  }

  if (allBudgetsOk) {
    alerts.push({
      key: `all_budgets_ok:${month}`,
      type: 'all_budgets_ok',
      severity: 'positive',
      icon: '🎉',
      title: 'On Track',
      message: "You're staying under all your budgets this month!",
      detail: null,
      action: { label: 'View Budgets', to: '/budgets' },
    });
  }

  const [categoryRows] = await pool.query(
    `SELECT c.id AS category_id, c.name AS category_name, SUM(t.amount) AS total
     FROM transactions t JOIN categories c ON t.category_id = c.id
     WHERE t.user_id = ? AND t.type = 'expense' AND DATE_FORMAT(t.txn_date,'%Y-%m') = ?
     GROUP BY c.id, c.name`,
    [userId, month]
  );
  const [previousCategoryRows] = await pool.query(
    `SELECT c.id AS category_id, SUM(t.amount) AS total
     FROM transactions t JOIN categories c ON t.category_id = c.id
     WHERE t.user_id = ? AND t.type = 'expense' AND DATE_FORMAT(t.txn_date,'%Y-%m') = ?
     GROUP BY c.id`,
    [userId, previousMonth]
  );
  const prevByCategory = Object.fromEntries(previousCategoryRows.map((r) => [r.category_id, Number(r.total)]));

  for (const c of categoryRows) {
    const prev = prevByCategory[c.category_id];
    const current = Number(c.total);
    if (!prev || prev < 200) continue;
    const increasePercent = Math.round(((current - prev) / prev) * 100);
    if (increasePercent >= 20) {
      alerts.push({
        key: `spending_increase:${c.category_id}:${month}`,
        type: 'spending_increase',
        severity: 'warning',
        icon: '🟡',
        title: 'Spending Increase',
        message: `You're spending ${increasePercent}% more on ${c.category_name} than usual.`,
        detail: `৳${Math.round(current).toLocaleString()} this month vs ৳${Math.round(prev).toLocaleString()} last month.`,
        action: { label: 'View Transactions', to: '/transactions' },
      });
    }
  }

  const [goalRows] = await pool.query(
    `SELECT id, name, target_amount, current_saved, status FROM goals WHERE user_id = ?`,
    [userId]
  );

  const MILESTONES = [100, 75, 50, 25];
  for (const g of goalRows) {
    if (g.status === 'abandoned') continue;
    const target = Number(g.target_amount || 0);
    const saved = Number(g.current_saved || 0);
    if (target <= 0) continue;
    const percent = Math.min(100, (saved / target) * 100);
    const remaining = Math.max(target - saved, 0);

    const reachedMilestone = MILESTONES.find((m) => percent >= m);
    if (reachedMilestone) {
      alerts.push({
        key: `goal_milestone:${g.id}:${reachedMilestone}`,
        type: 'goal_milestone',
        severity: reachedMilestone === 100 ? 'positive' : 'positive',
        icon: reachedMilestone === 100 ? '🎉' : '🎉',
        title: reachedMilestone === 100 ? 'Goal Completed!' : 'Goal Milestone',
        message: reachedMilestone === 100
          ? `🎉 Goal completed! You reached your ${g.name} goal!`
          : `You've reached ${reachedMilestone}% of your ${g.name} goal!`,
        detail: `৳${Math.round(saved).toLocaleString()} of ৳${Math.round(target).toLocaleString()} saved.`,
        action: { label: 'View Goal', to: '/goals' },
      });
    }

    if (remaining > 0 && (remaining <= 2000 || remaining / target <= 0.05)) {
      alerts.push({
        key: `goal_progress:${g.id}`,
        type: 'goal_progress',
        severity: 'positive',
        icon: '🎯',
        title: 'Almost There',
        message: `You're only ৳${Math.round(remaining).toLocaleString()} away from your ${g.name} goal!`,
        detail: null,
        action: { label: 'View Goal', to: '/goals' },
      });
    }
  }

  const [[totals]] = await pool.query(
    `SELECT
      COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expense
     FROM transactions WHERE user_id = ? AND DATE_FORMAT(txn_date,'%Y-%m') = ?`,
    [userId, month]
  );
  const income = Number(totals?.income || 0);
  const expense = Number(totals?.expense || 0);
  const balance = income - expense;
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;

  if (income > 0 && savingsRate >= 20 && balance > 0) {
    alerts.push({
      key: `savings_achievement:${month}`,
      type: 'savings_achievement',
      severity: 'positive',
      icon: '💰',
      title: 'Savings Achievement',
      message: `You've saved ৳${Math.round(balance).toLocaleString()} this month. That's a ${Math.round(savingsRate)}% savings rate!`,
      detail: null,
      action: { label: 'View Dashboard', to: '/dashboard' },
    });
  }

  return alerts;
}

exports.getAlerts = async (req, res) => {
  try {
    const month = req.query.month || getMonth();

    const alerts = await computeAlerts(req.user.id, month);

    const [stateRows] = await pool.query(
      'SELECT alert_key, status FROM alert_states WHERE user_id = ?',
      [req.user.id]
    );
    const stateByKey = Object.fromEntries(stateRows.map((r) => [r.alert_key, r.status]));

    const merged = alerts
      .map((a) => ({ ...a, status: stateByKey[a.key] || 'unread' }))
      .filter((a) => a.status !== 'dismissed')
      .sort((a, b) => (TYPE_RANK[a.type] ?? 99) - (TYPE_RANK[b.type] ?? 99));

    const unreadCount = merged.filter((a) => a.status === 'unread').length;

    res.json({
      alerts: merged,
      top_alerts: merged.slice(0, 4),
      unread_count: unreadCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { key } = req.params;
    await pool.query(
      `INSERT INTO alert_states (user_id, alert_key, status) VALUES (?, ?, 'read')
       ON DUPLICATE KEY UPDATE status = IF(status = 'dismissed', status, 'read')`,
      [req.user.id, key]
    );
    res.json({ message: 'Alert marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const month = req.body.month || getMonth();
    const alerts = await computeAlerts(req.user.id, month);
    if (alerts.length === 0) return res.json({ message: 'No alerts to mark' });

    const values = alerts.map((a) => [req.user.id, a.key, 'read']);
    await pool.query(
      `INSERT INTO alert_states (user_id, alert_key, status) VALUES ?
       ON DUPLICATE KEY UPDATE status = IF(status = 'dismissed', status, 'read')`,
      [values]
    );
    res.json({ message: 'All alerts marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.dismissAlert = async (req, res) => {
  try {
    const { key } = req.params;
    await pool.query(
      `INSERT INTO alert_states (user_id, alert_key, status) VALUES (?, ?, 'dismissed')
       ON DUPLICATE KEY UPDATE status = 'dismissed'`,
      [req.user.id, key]
    );
    res.json({ message: 'Alert dismissed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
