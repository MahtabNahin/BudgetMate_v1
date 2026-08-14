import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import './Admin.css';

const money = (value) => `৳${Number(value || 0).toLocaleString()}`;

function StatCard({ icon, label, value, note, tone = '' }) {
  return (
    <div className={`admin-stat-card ${tone}`}>
      <div className="admin-stat-icon">{icon}</div>
      <div className="admin-stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
        {note && <small>{note}</small>}
      </div>
    </div>
  );
}

export default function Admin() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'expense' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewRes, usersRes, categoriesRes] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/users'),
        api.get('/categories'),
      ]);
      setOverview(overviewRes.data);
      setUsers(usersRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Could not load the admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      String(user.name || '').toLowerCase().includes(term) ||
      String(user.email || '').toLowerCase().includes(term)
    );
  }, [users, search]);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;
    setSavingCategory(true);
    try {
      await api.post('/categories', {
        name: categoryForm.name.trim(),
        type: categoryForm.type,
      });
      setCategoryForm({ name: '', type: 'expense' });
      const res = await api.get('/categories');
      setCategories(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create category.');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category? Existing transactions using it may also be affected by your database foreign-key rules.')) return;
    try {
      await api.delete(`/categories/${id}`);
      setCategories((prev) => prev.filter((category) => category.id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete category.');
    }
  };

  if (loading) {
    return (
      <div className="admin-page admin-loading">
        <div className="admin-loading-card">
          <div className="admin-spinner" />
          <strong>Loading Admin Dashboard…</strong>
          <span>Preparing your system overview.</span>
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="admin-page">
        <div className="admin-error-card">
          <div className="admin-error-icon">⚠️</div>
          <h2>We couldn't load the Admin Dashboard</h2>
          <p>{error}</p>
          <button className="admin-primary-btn" onClick={load}>Try again</button>
        </div>
      </div>
    );
  }

  const currentMonth = overview?.currentMonth || new Date().toISOString().slice(0, 7);
  const monthLabel = new Date(`${currentMonth}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const growthMax = Math.max(...(overview?.userGrowth || []).map((item) => Number(item.count)), 1);
  const categoryMax = Math.max(...(overview?.expenseCategories || []).map((item) => Number(item.total)), 1);

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <div className="admin-eyebrow">ADMIN CONSOLE</div>
          <h1>Good evening, Admin 👋</h1>
          <p>Here's what's happening across BudgetMate this month.</p>
        </div>
        <div className="admin-system-pill"><span>●</span> System operational</div>
      </header>

      {error && <div className="admin-inline-error">⚠️ {error}</div>}

      <section className="admin-stats-grid">
        <StatCard icon="👥" label="Total Users" value={overview.stats.totalUsers} note={`+${overview.stats.newUsersThisMonth} this month`} />
        <StatCard icon="💰" label="Transactions" value={overview.stats.totalTransactions} note={`${overview.stats.monthTransactions} this month`} tone="purple" />
        <StatCard icon="🎯" label="Savings Goals" value={overview.stats.totalGoals} note={`${overview.stats.completedGoals} completed`} tone="green" />
        <StatCard icon="📊" label="Budgets" value={overview.stats.totalBudgets} note={`${overview.stats.activeBudgets} current-month budgets`} tone="orange" />
      </section>

      <section className="admin-main-grid">
        <div className="admin-panel admin-users-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>👥 User Management</h2>
              <p>Registered BudgetMate accounts</p>
            </div>
            <span className="admin-count-badge">{users.length} users</span>
          </div>

          <div className="admin-search-wrap">
            <span>⌕</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" />
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Joined</th><th>Activity</th></tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-avatar">{String(user.name || '?').charAt(0).toUpperCase()}</div>
                        <div><strong>{user.name}</strong><span>{user.email}</span></div>
                      </div>
                    </td>
                    <td><span className={`role-pill ${user.role === 'admin' ? 'admin-role' : ''}`}>{user.role}</span></td>
                    <td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td>
                    <td><span className="activity-number">{user.transaction_count || 0} transactions</span></td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && <tr><td colSpan="4" className="admin-empty-row">No users match your search.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-panel admin-activity-panel">
          <div className="admin-panel-heading">
            <div><h2>🕐 Recent Activity</h2><p>Latest system events</p></div>
          </div>
          <div className="admin-activity-list">
            {(overview.recentActivity || []).map((item) => (
              <div className="admin-activity-item" key={`${item.type}-${item.id}`}>
                <div className={`admin-activity-icon ${item.type}`}>{item.type === 'transaction' ? '💰' : '👤'}</div>
                <div className="admin-activity-copy">
                  <strong>{item.title}</strong>
                  <span>{item.subtitle}</span>
                </div>
                <time>{item.created_at ? new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</time>
              </div>
            ))}
            {(!overview.recentActivity || overview.recentActivity.length === 0) && <div className="admin-empty-state">No recent activity yet.</div>}
          </div>
        </div>
      </section>

      <section className="admin-analytics-grid">
        <div className="admin-panel">
          <div className="admin-panel-heading"><div><h2>📈 User Growth</h2><p>New registrations over the last 6 months</p></div></div>
          <div className="admin-bar-chart">
            {(overview.userGrowth || []).map((item) => (
              <div className="admin-bar-column" key={item.month}>
                <span>{item.count}</span>
                <div className="admin-bar-track"><div className="admin-bar-fill" style={{ height: `${Math.max((Number(item.count) / growthMax) * 100, Number(item.count) ? 8 : 2)}%` }} /></div>
                <small>{new Date(`${item.month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short' })}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-heading"><div><h2>💸 Expense Categories</h2><p>Across all users · {monthLabel}</p></div></div>
          <div className="admin-category-bars">
            {(overview.expenseCategories || []).slice(0, 6).map((item) => (
              <div className="admin-category-row" key={item.category_name}>
                <div><strong>{item.category_name}</strong><span>{money(item.total)}</span></div>
                <div className="admin-category-track"><div className="admin-category-fill" style={{ width: `${(Number(item.total) / categoryMax) * 100}%` }} /></div>
              </div>
            ))}
            {(!overview.expenseCategories || overview.expenseCategories.length === 0) && <div className="admin-empty-state">No expenses recorded this month.</div>}
          </div>
        </div>
      </section>

      <section className="admin-panel admin-categories-panel">
        <div className="admin-panel-heading">
          <div><h2>🏷️ Category Management</h2><p>Manage categories available to the admin account</p></div>
        </div>
        <form className="admin-category-form" onSubmit={handleCreateCategory}>
          <input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="New category name" required />
          <select value={categoryForm.type} onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <button className="admin-primary-btn" disabled={savingCategory}>{savingCategory ? 'Adding…' : '+ Add Category'}</button>
        </form>
        <div className="admin-category-chips">
          {categories.map((category) => (
            <div className="admin-category-chip" key={category.id}>
              <span>{category.type === 'income' ? '↗' : '↘'} {category.name}</span>
              {category.user_id != null && <button onClick={() => handleDeleteCategory(category.id)} aria-label={`Delete ${category.name}`}>×</button>}
            </div>
          ))}
        </div>
      </section>

      <div className="admin-footer-note">BudgetMate Admin · Data is read from the existing users, transactions, budgets, goals and categories tables.</div>
    </div>
  );
}
