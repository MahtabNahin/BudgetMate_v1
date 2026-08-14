const pool = require('../config/db');

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

exports.getOverview = async (req, res) => {
  try {
    const month = getCurrentMonth();

    const [[userStats]] = await pool.query(`
      SELECT
        COUNT(*) AS total_users,
        SUM(CASE WHEN DATE_FORMAT(created_at, '%Y-%m') = ? THEN 1 ELSE 0 END) AS new_users_this_month
      FROM users
    `, [month]);

    const [[transactionStats]] = await pool.query(`
      SELECT
        COUNT(*) AS total_transactions,
        SUM(CASE WHEN DATE_FORMAT(txn_date, '%Y-%m') = ? THEN 1 ELSE 0 END) AS month_transactions
      FROM transactions
    `, [month]);

    const [[goalStats]] = await pool.query(`
      SELECT
        COUNT(*) AS total_goals,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_goals
      FROM goals
    `);

    const [[budgetStats]] = await pool.query(`
      SELECT
        COUNT(*) AS total_budgets,
        SUM(CASE WHEN month_year = ? THEN 1 ELSE 0 END) AS active_budgets
      FROM budgets
    `, [month]);

    const [userGrowth] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `);

    const [expenseCategories] = await pool.query(`
      SELECT c.name AS category_name, COALESCE(SUM(t.amount), 0) AS total
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      WHERE t.type = 'expense'
        AND DATE_FORMAT(t.txn_date, '%Y-%m') = ?
      GROUP BY c.id, c.name
      ORDER BY total DESC
      LIMIT 8
    `, [month]);

    const [recentUsers] = await pool.query(`
      SELECT id, name, email, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 6
    `);

    const [recentTransactions] = await pool.query(`
      SELECT t.id, t.user_id, t.amount, t.type, t.created_at,
             u.name AS user_name, c.name AS category_name
      FROM transactions t
      JOIN users u ON u.id = t.user_id
      JOIN categories c ON c.id = t.category_id
      ORDER BY t.created_at DESC
      LIMIT 8
    `);

    const recentActivity = [
      ...recentUsers.map((u) => ({
        id: u.id,
        type: 'user',
        created_at: u.created_at,
        title: 'New user registered',
        subtitle: `${u.name} · ${u.email}`,
      })),
      ...recentTransactions.map((t) => ({
        id: t.id,
        type: 'transaction',
        created_at: t.created_at,
        title: `${t.type === 'income' ? 'Income' : 'Expense'} recorded`,
        subtitle: `${t.user_name} · ${t.category_name} · ৳${Number(t.amount).toLocaleString()}`,
      })),
    ]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    res.json({
      currentMonth: month,
      stats: {
        totalUsers: Number(userStats.total_users || 0),
        newUsersThisMonth: Number(userStats.new_users_this_month || 0),
        totalTransactions: Number(transactionStats.total_transactions || 0),
        monthTransactions: Number(transactionStats.month_transactions || 0),
        totalGoals: Number(goalStats.total_goals || 0),
        completedGoals: Number(goalStats.completed_goals || 0),
        totalBudgets: Number(budgetStats.total_budgets || 0),
        activeBudgets: Number(budgetStats.active_budgets || 0),
      },
      userGrowth: userGrowth.map((row) => ({ month: row.month, count: Number(row.count) })),
      expenseCategories: expenseCategories.map((row) => ({
        category_name: row.category_name,
        total: Number(row.total),
      })),
      recentActivity,
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ message: 'Server error while loading admin overview' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.role, u.created_at,
        COUNT(t.id) AS transaction_count
      FROM users u
      LEFT JOIN transactions t ON t.user_id = u.id
      GROUP BY u.id, u.name, u.email, u.role, u.created_at
      ORDER BY u.created_at DESC
    `);

    res.json(rows.map((row) => ({
      ...row,
      transaction_count: Number(row.transaction_count || 0),
    })));
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ message: 'Server error while loading users' });
  }
};
