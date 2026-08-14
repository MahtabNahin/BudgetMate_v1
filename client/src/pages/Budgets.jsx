import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import AddBudgetModal from '../components/AddBudgetModal';
import { useToast } from '../context/ToastContext';
import { notifyDataChanged } from '../context/AlertsContext';
import './Budgets.css';

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showModal, setShowModal] = useState(false);
  const showToast = useToast();

  const loadBudgets = () => api.get('/budgets', { params: { month } }).then((res) => setBudgets(res.data));

  useEffect(() => {
    loadBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this budget? This cannot be undone.')) return;
    try {
      await api.delete(`/budgets/${id}`);
      await loadBudgets();
      notifyDataChanged();
      showToast('Budget removed ✓');
    } catch {
      showToast('Could not remove budget', 'error');
    }
  };

  const totalLimit = budgets.reduce((sum, b) => sum + Number(b.limit_amount), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spent), 0);

  return (
    <div className="page budgets-page">
      <div className="budgets-header">
        <div>
          <h1>Budgets</h1>
          <p className="budgets-subtitle">Set spending limits per category and track them in real time.</p>
        </div>

        <div className="budgets-header-actions">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="month-input" />
          <button className="add-budget-btn" onClick={() => setShowModal(true)}>＋ Add Budget</button>
        </div>
      </div>

      {budgets.length > 0 && (
        <div className="budgets-summary-row">
          <div className="budgets-summary-card">
            <span className="summary-label">Total Budgeted</span>
            <span className="summary-value">৳{totalLimit.toLocaleString()}</span>
          </div>
          <div className="budgets-summary-card">
            <span className="summary-label">Total Spent</span>
            <span className="summary-value spent">৳{totalSpent.toLocaleString()}</span>
          </div>
          <div className="budgets-summary-card">
            <span className="summary-label">Remaining</span>
            <span className="summary-value remaining">৳{Math.max(totalLimit - totalSpent, 0).toLocaleString()}</span>
          </div>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="budgets-empty">
          <span className="empty-icon">💳</span>
          <h3>No budgets set for {month}</h3>
          <p>Add a budget to start tracking your spending against a limit.</p>
          <button className="add-budget-btn" onClick={() => setShowModal(true)}>＋ Add Your First Budget</button>
        </div>
      ) : (
        <div className="budgets-grid">
          {budgets.map((b) => (
            <div key={b.id} className={`budget-card status-${b.status}`}>
              <div className="budget-card-top">
                <h3>{b.category_name}</h3>
                <button className="budget-delete-btn" onClick={() => handleDelete(b.id)} title="Remove budget">✕</button>
              </div>

              <div className="budget-card-amounts">
                <span className="spent-amount">৳{Number(b.spent).toLocaleString()}</span>
                <span className="limit-amount"> / ৳{Number(b.limit_amount).toLocaleString()}</span>
              </div>

              <div className="progress-track">
                <div
                  className={`progress-fill ${b.status === 'exceeded' ? 'danger' : b.status === 'warning' ? 'warning' : 'good'}`}
                  style={{ width: `${Math.min(b.percent_used, 100)}%` }}
                />
              </div>

              <div className="budget-card-bottom">
                <span className={`budget-status-tag tag-${b.status}`}>
                  {b.status === 'exceeded' ? '⚠ Over budget' : b.status === 'warning' ? '⚠ Near limit' : '✓ On track'}
                </span>
                <span className="budget-percent">{b.percent_used}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddBudgetModal
          month={month}
          onClose={() => setShowModal(false)}
          onSaved={async () => { await loadBudgets(); showToast('Budget created ✓'); }}
        />
      )}
    </div>
  );
}
