import React, { useEffect, useMemo, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AddBudgetModal from '../components/AddBudgetModal';
import AddGoalModal from '../components/AddGoalModal';
import AddMoneyModal from '../components/AddMoneyModal';
import QuickAddModal from '../components/QuickAddModal';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

function CountUp({ value, prefix = '৳', decimals = 0 }) {
  const numeric = Number(value) || 0;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame;
    const start = performance.now();
    const duration = 650;
    const from = 0;
    const animate = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (numeric - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [numeric]);

  return <>{prefix}{display.toLocaleString(undefined, { maximumFractionDigits: decimals })}</>;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getMonthStatus(status) {
  if (status === 'over_budget') return { icon: '🔴', text: "You're currently over your budget", className: 'danger' };
  if (status === 'spending_fast') return { icon: '🟡', text: "You're spending a little faster than usual", className: 'warning' };
  if (status === 'saving_more') return { icon: '🎉', text: "Great job! You're saving more than usual", className: 'success' };
  return { icon: '🟢', text: "You're on track this month", className: 'success' };
}

export default function Dashboard() {
  const { user } = useAuth();
  const showToast = useToast();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [dashboard, setDashboard] = useState(null);
  const [dashboardError, setDashboardError] = useState('');
  const [summary, setSummary] = useState({ monthly: [], byCategory: [] });
  const [predictions, setPredictions] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [recurringCandidates, setRecurringCandidates] = useState([]);
  const [badges, setBadges] = useState([]);
  const [goals, setGoals] = useState([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  const loadDashboard = async () => {
    setDashboardError('');

    try {
      const dash = await api.get('/dashboard', { params: { month: currentMonth } });
      setDashboard(dash.data);
    } catch (error) {
      console.error('Dashboard API error:', error);
      const message = error?.response?.data?.message || error?.message || 'Unable to load the dashboard.';
      setDashboardError(message);
      return;
    }

    const results = await Promise.allSettled([
      api.get('/transactions/summary', { params: { month: currentMonth } }),
      api.get('/insights/predictions', { params: { month: currentMonth } }),
      api.get('/insights/anomalies'),
      api.get('/recurring/detect'),
      api.get('/goals'),
      api.get('/streaks/badges'),
    ]);

    const [sum, preds, anomaly, recurring, goalRes, badgeRes] = results;
    if (sum.status === 'fulfilled') setSummary(sum.value.data);
    else console.error('Summary widget error:', sum.reason);
    if (preds.status === 'fulfilled') setPredictions(preds.value.data);
    else console.error('Prediction widget error:', preds.reason);
    if (anomaly.status === 'fulfilled') setAnomalies(anomaly.value.data);
    else console.error('Anomaly widget error:', anomaly.reason);
    if (recurring.status === 'fulfilled') setRecurringCandidates(recurring.value.data);
    else console.error('Recurring widget error:', recurring.reason);
    if (goalRes.status === 'fulfilled') setGoals(goalRes.value.data);
    else console.error('Goals widget error:', goalRes.reason);
    if (badgeRes.status === 'fulfilled') setBadges(badgeRes.value.data);
    else console.error('Badge widget error:', badgeRes.reason);
  };

  useEffect(() => {
    loadDashboard();

    const handleGoalsUpdated = () => {
      loadDashboard();
    };

    window.addEventListener('budgetmate:goals-updated', handleGoalsUpdated);
    return () => window.removeEventListener('budgetmate:goals-updated', handleGoalsUpdated);
  }, [currentMonth]);

  const dashboardGoals = useMemo(() => {
    const validTime = (value) => {
      if (!value) return 0;
      const time = new Date(value).getTime();
      return Number.isFinite(time) ? time : 0;
    };

    return [...goals]
      .sort((a, b) => {
        const updatedA = validTime(a.updated_at || a.updatedAt || a.last_updated || a.lastUpdated);
        const updatedB = validTime(b.updated_at || b.updatedAt || b.last_updated || b.lastUpdated);

        if (updatedA || updatedB) return updatedB - updatedA;

        const savedA = Number(a.current_saved || 0);
        const savedB = Number(b.current_saved || 0);
        const hasSavedA = savedA > 0 ? 1 : 0;
        const hasSavedB = savedB > 0 ? 1 : 0;

        if (hasSavedA !== hasSavedB) return hasSavedB - hasSavedA;
        if (savedA !== savedB) return savedB - savedA;

        return validTime(a.target_date) - validTime(b.target_date);
      })
      .slice(0, 2);
  }, [goals]);

  if (!dashboard) {
    return (
      <div className="dashboard-page dashboard-loading">
        {dashboardError ? (
          <div className="dashboard-load-error">
            <div className="load-error-icon">⚠️</div>
            <h2>We couldn't load your dashboard</h2>
            <p>{dashboardError}</p>
            <button className="quick-btn primary" onClick={loadDashboard}>Try again</button>
          </div>
        ) : (
          <div className="loading-pulse">Loading your financial overview…</div>
        )}
      </div>
    );
  }

  const status = getMonthStatus(dashboard.month_status);
  const savings = Math.max(dashboard.balance, 0);
  const todayPercent = dashboard.today_percent;
  const todayWidth = Math.min(todayPercent, 100);
  const budgetTotal = dashboard.budgets.reduce((sum, b) => sum + Number(b.limit_amount), 0);
  const budgetSpent = dashboard.budgets.reduce((sum, b) => sum + Number(b.spent), 0);
  const budgetPercent = budgetTotal > 0 ? Math.round((budgetSpent / budgetTotal) * 100) : 0;
  const formattedMonth = new Date(`${currentMonth}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const months = [...new Set(summary.monthly.map((m) => m.month))];
  const incomeByMonth = months.map((m) => Number(summary.monthly.find((r) => r.month === m && r.type === 'income')?.total || 0));
  const expenseByMonth = months.map((m) => Number(summary.monthly.find((r) => r.month === m && r.type === 'expense')?.total || 0));

  const barData = {
    labels: months,
    datasets: [
      { label: 'Income', data: incomeByMonth, backgroundColor: '#22c55e', borderRadius: 6, borderSkipped: false },
      { label: 'Expense', data: expenseByMonth, backgroundColor: '#ef4444', borderRadius: 6, borderSkipped: false },
    ],
  };

  const categoryExpenses = dashboard.category_expenses || [];
  const pieData = {
    labels: categoryExpenses.map((c) => c.category_name),
    datasets: [{
      data: categoryExpenses.map((c) => Number(c.total)),
      backgroundColor: ['#3b82f6','#ef4444','#f59e0b','#22c55e','#8b5cf6','#06b6d4','#f97316','#64748b'],
      borderWidth: 3,
      borderColor: '#fff',
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, padding: 16 } },
      tooltip: { callbacks: { label: (context) => `${context.dataset.label || context.label}: ৳${Number(context.raw).toLocaleString()}` } },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#eef0f3' }, ticks: { callback: (value) => `৳${Number(value).toLocaleString()}` } },
      x: { grid: { display: false } },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 14 } },
      tooltip: { callbacks: { label: (context) => ` ${context.label}: ৳${Number(context.raw).toLocaleString()}` } },
    },
  };

  const confirmRecurring = async (candidate) => {
    try {
      await api.post('/recurring', {
        category_id: candidate.category_id,
        amount: candidate.avg_amount,
        day_of_month: candidate.day_of_month,
      });
      setRecurringCandidates((prev) => prev.filter((c) => c !== candidate));
      showToast('Recurring payment saved ✓');
    } catch {
      showToast('Could not save recurring payment', 'error');
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header personalized-header">
        <div>
          <div className="greeting-eyebrow">{getGreeting()} 👋</div>
          <h1>{user?.name ? `${user.name}, here's how your money is doing.` : "Here's how your money is doing."}</h1>
          <p className="dashboard-subtitle">A live view of your finances for {formattedMonth}.</p>
          <div className={`financial-status ${status.className}`}>
            <span>{status.icon}</span>
            <strong>{status.text}</strong>
          </div>
        </div>
        <div className="header-actions">
          <div className="month-selector"><span>📅</span>{formattedMonth}</div>
          <button className="quick-btn primary" onClick={() => setShowQuickAdd(true)}><span>＋</span> Quick Add</button>
        </div>
      </div>

      <div className="summary-grid primary-summary">
        <div className="summary-card balance-card priority-card">
          <div className="summary-card-top"><div className="summary-icon">💰</div><span className="summary-label">Current Balance</span></div>
          <h2><CountUp value={dashboard.balance} /></h2>
          <p className={dashboard.balance >= 0 ? 'positive' : 'negative'}>{dashboard.savings_rate}% savings rate</p>
        </div>

        <div className="summary-card today-card priority-card">
          <div className="summary-card-top"><div className="summary-icon orange">🧾</div><span className="summary-label">Today's Spending</span></div>
          <h2><CountUp value={dashboard.spent_today} /></h2>
          <div className="today-target">of ৳{dashboard.daily_target.toLocaleString()} daily target</div>
          <div className="progress-track today-progress"><div className={`progress-fill ${dashboard.today_status === 'over' ? 'danger' : dashboard.today_status === 'close' ? 'warning' : 'good'}`} style={{ width: `${todayWidth}%` }} /></div>
          <div className="today-bottom"><span>{todayPercent}% used</span><strong>৳{dashboard.daily_remaining.toLocaleString()} remaining</strong></div>
          <small className={`today-message ${dashboard.today_status}`}>
            {dashboard.today_status === 'over' ? '🔴 You\'ve exceeded today\'s target' : dashboard.today_status === 'close' ? '🟡 You\'re getting close to today\'s limit' : '🟢 You\'re within today\'s target'}
          </small>
        </div>

        <div className="summary-card savings-card priority-card">
          <div className="summary-card-top"><div className="summary-icon purple">🎯</div><span className="summary-label">Monthly Savings</span></div>
          <h2><CountUp value={savings} /></h2>
          <p className="positive">{dashboard.savings_rate}% of income</p>
          {dashboard.previous_savings_rate !== null && <small className="comparison-note">{dashboard.savings_rate >= dashboard.previous_savings_rate ? '↑' : '↓'} vs last month</small>}
        </div>

        <div className="summary-card cashflow-card">
          <div className="summary-card-top"><div className="summary-icon green">↗</div><span className="summary-label">Monthly Cash Flow</span></div>
          <h2><CountUp value={dashboard.income} /></h2>
          <div className="cashflow-line"><span>Income</span><strong className="positive">৳{dashboard.income.toLocaleString()}</strong></div>
          <div className="cashflow-line"><span>Expenses</span><strong className="negative">৳{dashboard.expense.toLocaleString()}</strong></div>
        </div>
      </div>

      <div className="streak-banner">
        <div className="streak-main"><span className="streak-fire">🔥</span><div><strong>{dashboard.tracking_streak} day tracking streak</strong><p>{dashboard.tracking_streak > 0 ? 'Keep recording your money every day.' : 'Start your tracking streak today 🔥'}</p></div></div>
        {dashboard.tracking_streak > 0 && <div className="streak-dots">{Array.from({ length: Math.min(dashboard.tracking_streak, 7) }).map((_, i) => <span key={i}>✓</span>)}</div>}
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card chart-card">
          <div className="card-heading"><div><h3>Income vs Expense</h3><p>Your financial activity over time</p></div><span className="card-icon">📊</span></div>
          <div className="chart-container">
            {months.length > 0 ? <Bar data={barData} options={chartOptions} /> : <div className="empty-state"><div>📊</div><p>Nothing here yet 🌱</p><span>Add your first transaction to start understanding your money.</span><button className="empty-action" onClick={() => setShowQuickAdd(true)}>＋ Add Transaction</button></div>}
          </div>
        </div>

        <div className="dashboard-card chart-card">
          <div className="card-heading"><div><h3>Spending by Category</h3><p>Where your money is going</p></div><span className="card-icon">🥧</span></div>
          <div className="chart-container pie-container">
            {categoryExpenses.length > 0 ? <Pie data={pieData} options={pieOptions} /> : <div className="empty-state"><div>🥧</div><p>No expenses yet 🌱</p><span>Your spending breakdown will appear here.</span></div>}
          </div>
        </div>
      </div>

      <div className="dashboard-grid attention-grid">
        <div className="dashboard-card smart-move-card">
          <div className="card-heading"><div><h3>💡 Smart Move</h3><p>One actionable suggestion based on your data</p></div></div>
          {dashboard.insight ? (
            <>
              <div className="smart-insight-message"><span>{dashboard.insight.icon}</span><div><strong>{dashboard.insight.message}</strong><p>{dashboard.insight.action}</p></div></div>
              {dashboard.insight.category_id && <button className="simulator-link" onClick={() => window.location.href = `/simulator?category=${dashboard.insight.category_id}`}>Try in Simulator →</button>}
            </>
          ) : (
            <div className="empty-state small"><p>Keep adding transactions to unlock personalized suggestions.</p></div>
          )}
        </div>

        <div className="dashboard-card">
          <div className="card-heading"><div><h3>Budget Overview</h3><p>{formattedMonth}</p></div><button className="card-link-btn" onClick={() => setShowBudgetModal(true)}>＋ Add Budget</button></div>
          {dashboard.budgets.length === 0 ? (
            <div className="empty-state small"><div>💳</div><p>Give your money a job.</p><span>Set a budget to start tracking spending against a limit.</span><button className="empty-action" onClick={() => setShowBudgetModal(true)}>Create Budget</button></div>
          ) : (
            <div className="budget-list">
              {dashboard.budgets.map((budget) => {
                const percent = Number(budget.percent_used);
                return <div key={budget.id} className="budget-item">
                  <div className="budget-info"><div><strong>{budget.category_name}</strong><span>৳{Number(budget.spent).toLocaleString()} / ৳{Number(budget.limit_amount).toLocaleString()}</span></div><strong className={percent > 100 ? 'budget-danger' : percent >= 80 ? 'budget-warning' : 'budget-good'}>{percent}%</strong></div>
                  <div className="progress-track"><div className={`progress-fill ${percent > 100 ? 'danger' : percent >= 80 ? 'warning' : 'good'}`} style={{ width: `${Math.min(percent, 100)}%` }} /></div>
                </div>;
              })}
            </div>
          )}
          {dashboard.budgets.length > 0 && <div className="budget-summary"><div><span>Total Budget</span><strong>৳{budgetTotal.toLocaleString()}</strong></div><div><span>Used</span><strong>{budgetPercent}%</strong></div></div>}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card goal-highlight">
          <div className="card-heading"><div><h3>🎯 Savings Goals</h3><p>What you're saving toward</p></div><button className="card-link-btn" onClick={() => setShowGoalModal(true)}>＋ Add Goal</button></div>
          {dashboardGoals.length > 0 ? (
            <div className="goal-highlight-list">
              {dashboardGoals.map((goal) => (
                <div className="goal-highlight-content" key={goal.id}>
                  <div className="goal-highlight-top"><strong>{goal.name}</strong><span className={`goal-mini-status ${goal.status}`}>{goal.status === 'completed' ? '🎉 Completed' : goal.status === 'on_track' ? '🟢 On track' : goal.status === 'slightly_behind' ? '🟡 Slightly behind' : '🔴 Behind schedule'}</span></div>
                  <div className="goal-highlight-amount">৳{Number(goal.current_saved || 0).toLocaleString()} <span>/ ৳{Number(goal.target_amount || 0).toLocaleString()}</span></div>
                  <div className="progress-track"><div className={`progress-fill ${goal.status === 'behind' ? 'danger' : goal.status === 'slightly_behind' ? 'warning' : 'good'}`} style={{ width: `${Math.min(Number(goal.percent_complete || 0), 100)}%` }} /></div>
                  <div className="goal-highlight-meta"><span>{Number(goal.percent_complete || 0)}% complete</span><span>Target: {new Date(goal.target_date).toLocaleDateString()}</span></div>
                  <p className="goal-monthly">Monthly target <strong>৳{Number(goal.required_monthly_saving || 0).toLocaleString()}</strong> · Current average <strong>৳{Number(goal.avg_monthly_surplus || 0).toLocaleString()}</strong></p>
                  {Number(goal.current_saved || 0) < Number(goal.target_amount || 0) && (
                    <button className="empty-action" onClick={() => setSelectedGoal(goal)}>＋ Add Money</button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state small"><div>🎯</div><p>Got something you're saving for?</p><span>Create a goal and keep your progress visible.</span><button className="empty-action" onClick={() => setShowGoalModal(true)}>Create Your First Goal</button></div>
          )}
        </div>

        <div className="dashboard-card">
          <div className="card-heading"><div><h3>🧠 Smart Insights</h3><p>Other signals from your activity</p></div></div>
          {predictions.length > 0 ? <ul className="insight-list">{predictions.slice(0, 3).map((p) => <li key={p.category_id}><div><strong>{p.category_name}</strong><span>Spent ৳{Number(p.spent_so_far).toLocaleString()}</span></div><strong>~৳{Number(p.projected_month_end).toLocaleString()}</strong></li>)}</ul> : <div className="no-insight">No projection available yet.</div>}
          <div className={`alert-summary ${anomalies.length ? 'has-alert' : ''}`}>{anomalies.length ? `⚠️ ${anomalies.length} unusual transaction${anomalies.length > 1 ? 's' : ''} detected` : '✓ No unusual transactions detected'}</div>
        </div>
      </div>

      {recurringCandidates.length > 0 && <div className="dashboard-card recurring-card"><div className="card-heading"><div><h3>🔄 Detected Recurring Payments</h3><p>BudgetMate found possible recurring expenses.</p></div></div><div className="recurring-list">{recurringCandidates.map((candidate, index) => <div className="recurring-item" key={index}><div><strong>{candidate.category_name}</strong><span>Around day {candidate.day_of_month} · {candidate.months_seen} months detected</span></div><div className="recurring-right"><strong>৳{Number(candidate.avg_amount).toLocaleString()}</strong><button onClick={() => confirmRecurring(candidate)}>Set as recurring</button></div></div>)}</div></div>}

      {badges.length > 0 && <div className="dashboard-card badges-card"><div className="card-heading"><div><h3>🏆 Your Achievements</h3><p>Keep building healthy financial habits.</p></div></div><div className="badge-shelf">{badges.map((badge) => <div key={badge.id} className="achievement"><div className="achievement-icon">🏅</div><span>{badge.badge_type}</span></div>)}</div></div>}

      {showQuickAdd && <QuickAddModal onClose={() => setShowQuickAdd(false)} onSaved={loadDashboard} />}
      {showBudgetModal && <AddBudgetModal month={currentMonth} onClose={() => setShowBudgetModal(false)} onSaved={async () => { await loadDashboard(); showToast('Budget created ✓'); }} />}
      {showGoalModal && <AddGoalModal onClose={() => setShowGoalModal(false)} onSaved={async () => { await loadDashboard(); showToast('New savings goal created 🎯'); }} />}
      {selectedGoal && (
        <AddMoneyModal
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onSaved={async () => {
            await loadDashboard();
          }}
        />
      )}
    </div>
  );
}
