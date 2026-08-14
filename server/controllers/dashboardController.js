const pool = require('../config/db');

const getMonth = () => new Date().toISOString().slice(0, 7);

const pad = (value) => String(value).padStart(2, '0');

const toDateKey = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return null;
};

const previousDay = (key) => {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const healthStatus = (score) => {
  if (score >= 85) return { label: 'Excellent', icon: '🌟', className: 'excellent' };
  if (score >= 70) return { label: 'Good', icon: '🟢', className: 'good' };
  if (score >= 55) return { label: 'Needs Attention', icon: '🟡', className: 'attention' };
  return { label: 'At Risk', icon: '🔴', className: 'risk' };
};

const calculateHealthScore = ({ savingsRate, budgets, goals, monthlyHistory, trackingDays }) => {
  const savingsComponent = clamp(savingsRate <= 0 ? 0 : (savingsRate / 25) * 100);

  let budgetComponent = 65;
  if (budgets.length) {
    const usages = budgets.map((budget) => Number(budget.percent_used));
    const avgUsage = usages.reduce((sum, value) => sum + value, 0) / usages.length;
    if (avgUsage <= 70) budgetComponent = 100;
    else if (avgUsage <= 80) budgetComponent = 90;
    else if (avgUsage <= 90) budgetComponent = 78;
    else if (avgUsage <= 100) budgetComponent = 60;
    else budgetComponent = 30;
  }

  let goalComponent = 65;
  if (goals.length) {
    const active = goals.filter((goal) => goal.status !== 'abandoned');
    if (active.length) {
      const goalScores = active.map((goal) => {
        if (Number(goal.current_saved) >= Number(goal.target_amount)) return 100;
        const actual = Number(goal.percent_complete || 0);
        const expected = Number(goal.expected_percent || 0);
        if (expected <= 0) return 100;
        return clamp((actual / expected) * 100);
      });
      goalComponent = goalScores.reduce((sum, value) => sum + value, 0) / goalScores.length;
    }
  }

  let spendingComponent = 70;
  const current = Number(monthlyHistory.find((row) => row.current)?.expense || 0);
  const historical = monthlyHistory
    .filter((row) => !row.current && Number(row.expense) > 0)
    .map((row) => Number(row.expense));
  if (historical.length) {
    if (current > 0) {
      const average = historical.reduce((sum, value) => sum + value, 0) / historical.length;
      const deviation = Math.abs(current - average) / Math.max(average, 1);
      if (deviation <= 0.10) spendingComponent = 100;
      else if (deviation <= 0.20) spendingComponent = 90;
      else if (deviation <= 0.35) spendingComponent = 75;
      else if (deviation <= 0.50) spendingComponent = 55;
      else spendingComponent = 35;
    }
  }

  const trackingComponent = clamp((Number(trackingDays) / 21) * 100);

  const weighted =
    savingsComponent * 0.30 +
    budgetComponent * 0.25 +
    goalComponent * 0.20 +
    spendingComponent * 0.15 +
    trackingComponent * 0.10;

  const score = Math.round(clamp(weighted));
  const status = healthStatus(score);
  const reasons = [];

  if (savingsComponent >= 80) reasons.push(`You're saving ${Math.max(0, Math.round(savingsRate))}% of your income.`);
  else if (savingsComponent < 55) reasons.push('Your savings rate has room to improve.');

  if (budgetComponent >= 85) reasons.push('Your spending is staying within your budgets.');
  else if (budgetComponent < 60) reasons.push('One or more budgets are close to or over their limits.');

  if (goalComponent >= 85) reasons.push('Your savings goals are progressing well.');
  else if (goalComponent < 60) reasons.push('Some savings goals are behind their expected progress.');

  if (spendingComponent >= 85) reasons.push('Your spending pattern is relatively consistent.');
  else if (spendingComponent < 60) reasons.push('Your spending is changing more than usual month to month.');

  if (trackingComponent >= 80) reasons.push("You're consistently recording transactions.");
  else if (trackingComponent < 55) reasons.push('Recording transactions more consistently would strengthen your score.');

  if (!reasons.length) reasons.push('Keep recording your transactions to make this score more precise.');

  return {
    score,
    status: status.label,
    status_icon: status.icon,
    status_class: status.className,
    reasons: reasons.slice(0, 4),
    components: {
      savings: Math.round(savingsComponent),
      budget: Math.round(budgetComponent),
      goals: Math.round(goalComponent),
      spending: Math.round(spendingComponent),
      tracking: Math.round(trackingComponent),
    },
  };
};

exports.getDashboard = async (req, res) => {
  try {
    const month = req.query.month || getMonth();
    const [year, monthNumber] = month.split('-').map(Number);

    if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) {
      return res.status(400).json({ message: 'Invalid month format' });
    }

    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const now = new Date();
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === monthNumber;
    const elapsedDays = isCurrentMonth ? now.getDate() : daysInMonth;

    const [[totals]] = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expense
       FROM transactions
       WHERE user_id = ? AND DATE_FORMAT(txn_date,'%Y-%m') = ?`,
      [req.user.id, month]
    );

    const [[todayRow]] = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS spent_today
       FROM transactions
       WHERE user_id = ? AND type='expense' AND txn_date = ?`,
      [req.user.id, today]
    );

    const [[budgetRow]] = await pool.query(
      `SELECT COALESCE(SUM(limit_amount),0) AS total_budget,
              COALESCE(SUM(spent),0) AS total_spent
       FROM (
         SELECT b.limit_amount,
                COALESCE((
                  SELECT SUM(t.amount)
                  FROM transactions t
                  WHERE t.user_id = b.user_id
                    AND t.category_id = b.category_id
                    AND t.type='expense'
                    AND DATE_FORMAT(t.txn_date,'%Y-%m') = b.month_year
                ),0) AS spent
         FROM budgets b
         WHERE b.user_id = ? AND b.month_year = ?
       ) x`,
      [req.user.id, month]
    );

    const income = Number(totals?.income || 0);
    const expense = Number(totals?.expense || 0);
    const balance = income - expense;
    const totalBudget = Number(budgetRow?.total_budget || 0);
    const spentToday = Number(todayRow?.spent_today || 0);

    const monthlySpendingAllowance = totalBudget > 0 ? totalBudget : Math.max(income * 0.8, expense);
    const dailyTarget = daysInMonth > 0 ? monthlySpendingAllowance / daysInMonth : 0;
    const todayPercent = dailyTarget > 0 ? Math.round((spentToday / dailyTarget) * 100) : 0;

    let todayStatus = 'within';
    if (todayPercent >= 100) todayStatus = 'over';
    else if (todayPercent >= 80) todayStatus = 'close';

    let monthStatus = 'track';
    if (totalBudget > 0 && expense > totalBudget) monthStatus = 'over_budget';
    else if (income > 0 && expense / income > 0.8) monthStatus = 'spending_fast';
    else if (balance > 0 && expense / Math.max(income, 1) < 0.6) monthStatus = 'saving_more';

    const [dateRows] = await pool.query(
      `SELECT DISTINCT txn_date
       FROM transactions
       WHERE user_id = ? AND txn_date <= ?
       ORDER BY txn_date DESC`,
      [req.user.id, today]
    );

    let streak = 0;
    let expected = today;
    for (const row of dateRows) {
      const key = toDateKey(row.txn_date);
      if (!key || key !== expected) break;
      streak += 1;
      expected = previousDay(expected);
    }

    const previousDate = new Date(year, monthNumber - 2, 1);
    const previousMonth = `${previousDate.getFullYear()}-${pad(previousDate.getMonth() + 1)}`;

    const [[previousTotals]] = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expense
       FROM transactions
       WHERE user_id = ? AND DATE_FORMAT(txn_date,'%Y-%m') = ?`,
      [req.user.id, previousMonth]
    );

    const previousIncome = Number(previousTotals?.income || 0);
    const previousExpense = Number(previousTotals?.expense || 0);
    const previousSavingsRate = previousIncome > 0 ? ((previousIncome - previousExpense) / previousIncome) * 100 : null;
    const savingsRate = income > 0 ? (balance / income) * 100 : 0;

    if (monthStatus !== 'over_budget' && monthStatus !== 'spending_fast' && previousSavingsRate !== null && savingsRate > previousSavingsRate) {
      monthStatus = 'saving_more';
    }

    const [categoryRows] = await pool.query(
      `SELECT c.id AS category_id, c.name AS category_name, SUM(t.amount) AS total
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type='expense'
         AND DATE_FORMAT(t.txn_date,'%Y-%m') = ?
       GROUP BY c.id, c.name
       ORDER BY total DESC`,
      [req.user.id, month]
    );

    const [previousCategoryRows] = await pool.query(
      `SELECT c.id AS category_id, c.name AS category_name, SUM(t.amount) AS total
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type='expense'
         AND DATE_FORMAT(t.txn_date,'%Y-%m') = ?
       GROUP BY c.id, c.name
       ORDER BY total DESC`,
      [req.user.id, previousMonth]
    );

    const [budgetRows] = await pool.query(
      `SELECT b.id, b.category_id, b.limit_amount, c.name AS category_name,
              COALESCE(SUM(CASE WHEN t.type='expense' AND DATE_FORMAT(t.txn_date,'%Y-%m') = ? THEN t.amount ELSE 0 END),0) AS spent
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       LEFT JOIN transactions t ON t.user_id = b.user_id AND t.category_id = b.category_id
       WHERE b.user_id = ? AND b.month_year = ?
       GROUP BY b.id, b.category_id, b.limit_amount, c.name`,
      [month, req.user.id, month]
    );

    const budgets = budgetRows.map((b) => {
      const limit = Number(b.limit_amount || 0);
      const spent = Number(b.spent || 0);
      return {
        ...b,
        limit_amount: limit,
        spent,
        percent_used: limit > 0 ? Math.round((spent / limit) * 100) : 0,
      };
    });

    const [goalRows] = await pool.query(
      `SELECT id, name, target_amount, current_saved, target_date, status, created_at
       FROM goals
       WHERE user_id = ?
       ORDER BY target_date`,
      [req.user.id]
    );

    const [[surplusRow]] = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expense,
        COUNT(DISTINCT DATE_FORMAT(txn_date,'%Y-%m')) AS months
       FROM transactions
       WHERE user_id = ?`,
      [req.user.id]
    );

    const transactionMonths = Math.max(Number(surplusRow?.months || 0), 1);
    const avgMonthlySurplus = (Number(surplusRow?.income || 0) - Number(surplusRow?.expense || 0)) / transactionMonths;

    const goals = goalRows.map((g) => {
      const targetAmount = Number(g.target_amount || 0);
      const saved = Number(g.current_saved || 0);
      const target = new Date(`${toDateKey(g.target_date)}T00:00:00`);
      const created = new Date(`${toDateKey(g.created_at) || today}T00:00:00`);
      const remaining = Math.max(targetAmount - saved, 0);
      const monthsLeftRaw = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
      const monthsLeft = Math.max(monthsLeftRaw, 1);
      const requiredMonthlySaving = remaining > 0 ? remaining / monthsLeft : 0;
      const percentComplete = targetAmount > 0 ? Math.min(100, Math.round((saved / targetAmount) * 100)) : 0;
      const totalMonths = (target.getFullYear() - created.getFullYear()) * 12 + (target.getMonth() - created.getMonth());
      const elapsedMonths = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
      const expectedPercent = totalMonths > 0 ? Math.min(100, Math.max(0, Math.round((elapsedMonths / totalMonths) * 100))) : 0;

      let computedStatus = 'on_track';
      if (saved >= targetAmount && targetAmount > 0) computedStatus = 'completed';
      else if (now > target && saved < targetAmount) computedStatus = 'behind';
      else if (avgMonthlySurplus <= 0 || avgMonthlySurplus < requiredMonthlySaving * 0.75) computedStatus = 'behind';
      else if (avgMonthlySurplus < requiredMonthlySaving || percentComplete + 10 < expectedPercent) computedStatus = 'slightly_behind';

      return {
        ...g,
        target_amount: targetAmount,
        current_saved: saved,
        months_left: monthsLeft,
        required_monthly_saving: Math.round(requiredMonthlySaving),
        avg_monthly_surplus: Math.round(avgMonthlySurplus),
        percent_complete: percentComplete,
        expected_percent: expectedPercent,
        status: computedStatus,
        on_track: computedStatus === 'on_track' || computedStatus === 'completed',
      };
    });

    const [historyRows] = await pool.query(
      `SELECT DATE_FORMAT(txn_date,'%Y-%m') AS month,
              COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS income,
              COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expense
       FROM transactions
       WHERE user_id = ?
         AND txn_date >= DATE_SUB(?, INTERVAL 5 MONTH)
         AND txn_date <= ?
       GROUP BY month
       ORDER BY month`,
      [req.user.id, `${month}-01`, `${month}-${pad(daysInMonth)}`]
    );

    const monthlyHistory = historyRows.map((row) => ({
      month: row.month,
      income: Number(row.income || 0),
      expense: Number(row.expense || 0),
      current: row.month === month,
    }));

    const [[trackingRow]] = await pool.query(
      `SELECT COUNT(DISTINCT txn_date) AS tracking_days
       FROM transactions
       WHERE user_id = ?
         AND txn_date >= DATE_SUB(?, INTERVAL 29 DAY)
         AND txn_date <= ?`,
      [req.user.id, today, today]
    );

    const trackingDays = Number(trackingRow?.tracking_days || 0);
    const moneyHealth = calculateHealthScore({ savingsRate, budgets, goals, monthlyHistory, trackingDays });

    let insight = null;
    if (budgets.some((b) => Number(b.spent) > Number(b.limit_amount))) {
      const b = budgets.find((x) => Number(x.spent) > Number(x.limit_amount));
      insight = {
        type: 'budget',
        icon: '⚠️',
        title: 'Smart Move',
        message: `${b.category_name} is over its budget by ৳${Math.round(Number(b.spent) - Number(b.limit_amount)).toLocaleString()}.`,
        action: 'Review your budget and reduce spending before the month ends.',
      };
    } else if (categoryRows.length > 0) {
      const top = categoryRows[0];
      const saving = Math.round(Number(top.total) * 0.10);
      insight = {
        type: 'category',
        icon: '💡',
        title: 'Smart Move',
        message: `${top.category_name} is currently your biggest expense category.`,
        action: `You could save about ৳${saving.toLocaleString()}/month by reducing ${top.category_name.toLowerCase()} by 10%.`,
        category_id: top.category_id,
      };
    } else if (previousSavingsRate !== null && savingsRate > previousSavingsRate) {
      insight = {
        type: 'savings',
        icon: '🎉',
        title: 'Great progress',
        message: `Your savings rate improved from ${previousSavingsRate.toFixed(1)}% to ${savingsRate.toFixed(1)}%.`,
        action: 'Keep the same spending habits to maintain the improvement.',
      };
    } else if (previousExpense > 0 && expense > previousExpense) {
      insight = {
        type: 'comparison',
        icon: '📈',
        title: 'Watch your spending',
        message: `Expenses are up ${Math.round(((expense - previousExpense) / previousExpense) * 100)}% compared with last month.`,
        action: 'Review your largest categories and look for one expense to trim.',
      };
    } else if (previousExpense > 0 && expense < previousExpense) {
      insight = {
        type: 'comparison',
        icon: '🌱',
        title: 'Nice work',
        message: `You've spent less than last month so far.`,
        action: 'Keep this pace and move the difference toward a savings goal.',
      };
    }

    res.json({
      month,
      income,
      expense,
      balance,
      savings_rate: Number(savingsRate.toFixed(1)),
      spent_today: spentToday,
      daily_target: Math.round(dailyTarget),
      daily_remaining: Math.max(Math.round(dailyTarget - spentToday), 0),
      today_percent: todayPercent,
      today_status: todayStatus,
      month_status: monthStatus,
      tracking_streak: streak,
      tracking_days: trackingDays,
      budgets,
      goals,
      top_category: categoryRows[0] || null,
      previous_expense: previousExpense,
      previous_income: previousIncome,
      previous_savings_rate: previousSavingsRate === null ? null : Number(previousSavingsRate.toFixed(1)),
      insight,
      money_health: moneyHealth,
      category_expenses: categoryRows.map((r) => ({ ...r, total: Number(r.total) })),
      previous_category_expenses: previousCategoryRows.map((r) => ({ ...r, total: Number(r.total) })),
      elapsed_days: elapsedDays,
      days_in_month: daysInMonth,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
