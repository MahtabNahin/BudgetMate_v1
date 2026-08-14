import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import AddGoalModal from '../components/AddGoalModal';
import AddMoneyModal from '../components/AddMoneyModal';
import { useToast } from '../context/ToastContext';
import { notifyDataChanged } from '../context/AlertsContext';
import './Goals.css';

const statusMeta = {
  completed: { icon: '🎉', label: 'Goal completed', className: 'tag-completed' },
  on_track: { icon: '🟢', label: 'On track', className: 'tag-ok' },
  slightly_behind: { icon: '🟡', label: 'Slightly behind', className: 'tag-warning' },
  behind: { icon: '🔴', label: 'Behind schedule', className: 'tag-danger' },
};

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const showToast = useToast();

  const loadGoals = () => api.get('/goals').then((res) => setGoals(res.data)).catch(() => showToast('Could not load goals', 'error'));

  useEffect(() => {
    loadGoals();
    const handleGoalUpdate = () => loadGoals();
    window.addEventListener('budgetmate:goals-updated', handleGoalUpdate);
    return () => window.removeEventListener('budgetmate:goals-updated', handleGoalUpdate);
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this savings goal? This cannot be undone.')) return;
    try {
      await api.delete(`/goals/${id}`);
      await loadGoals();
      notifyDataChanged();
      showToast('Savings goal deleted ✓');
    } catch {
      showToast('Could not delete goal', 'error');
    }
  };

  return (
    <div className="page goals-page">
      <div className="goals-header">
        <div>
          <h1>Savings Goals</h1>
          <p className="goals-subtitle">Set targets and watch your progress build over time.</p>
        </div>
        <button className="add-goal-btn" onClick={() => setShowModal(true)}>＋ Add Goal</button>
      </div>

      {goals.length === 0 ? (
        <div className="goals-empty">
          <span className="empty-icon">🎯</span>
          <h3>Got something you're saving for?</h3>
          <p>Create your first savings goal and keep your progress visible.</p>
          <button className="add-goal-btn" onClick={() => setShowModal(true)}>＋ Create Your First Goal</button>
        </div>
      ) : (
        <div className="goals-grid">
          {goals.map((g) => {
            const meta = statusMeta[g.status] || statusMeta.behind;
            return (
              <div key={g.id} className={`goal-card goal-status-${g.status}`}>
                <div className="goal-card-top">
                  <h3>🎯 {g.name}</h3>
                  <button className="goal-delete-btn" onClick={() => handleDelete(g.id)} title="Delete goal">✕</button>
                </div>

                <div className="goal-amount-display">
                  <strong>৳{Number(g.current_saved).toLocaleString()}</strong>
                  <span>/ ৳{Number(g.target_amount).toLocaleString()}</span>
                </div>

                <div className="goal-percent-row">
                  <span>{g.percent_complete}% completed</span>
                  <strong>{meta.icon} {meta.label}</strong>
                </div>

                <div className="progress-track goal-progress-large">
                  <div className={`progress-fill ${g.status === 'behind' ? 'danger' : g.status === 'slightly_behind' ? 'warning' : 'good'}`} style={{ width: `${Math.min(g.percent_complete, 100)}%` }} />
                </div>

                <div className="goal-meta goal-meta-grid">
                  <span><small>Target date</small>{new Date(g.target_date).toLocaleDateString()}</span>
                  <span><small>Time left</small>{g.months_left} month{g.months_left === 1 ? '' : 's'}</span>
                </div>

                <div className="goal-financial-details">
                  <div><span>Monthly target</span><strong>৳{Number(g.required_monthly_saving).toLocaleString()}</strong></div>
                  <div><span>Current monthly saving</span><strong>৳{Number(g.avg_monthly_surplus).toLocaleString()}</strong></div>
                </div>

                <div className={`goal-status-message ${meta.className}`}>
                  {g.status === 'completed'
                    ? '🎉 You reached this goal!'
                    : g.status === 'on_track'
                      ? '🟢 Your current saving pace is enough to reach the target.'
                      : g.status === 'slightly_behind'
                        ? '🟡 A small increase in monthly saving will help you catch up.'
                        : '🔴 Your current saving pace is below what this goal requires.'}
                </div>

                <div className="goal-card-actions">
                  <button
                    className="goal-add-money-btn"
                    onClick={() => setSelectedGoal(g)}
                    disabled={g.status === 'completed'}
                  >
                    ＋ Add Money
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <AddGoalModal onClose={() => setShowModal(false)} onSaved={async () => { await loadGoals(); showToast('New savings goal created 🎯'); }} />}
      {selectedGoal && (
        <AddMoneyModal
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onSaved={async () => { await loadGoals(); }}
        />
      )}
    </div>
  );
}
