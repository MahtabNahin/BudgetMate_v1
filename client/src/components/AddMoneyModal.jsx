import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

export default function AddMoneyModal({ goal, onClose, onSaved }) {
  const showToast = useToast();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const remaining = useMemo(
    () => Math.max(Number(goal?.target_amount || 0) - Number(goal?.current_saved || 0), 0),
    [goal]
  );

  useEffect(() => {
    setAmount('');
    setNote('');
    setError('');
  }, [goal?.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    setError('');

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }

    if (remaining <= 0) {
      setError('This goal is already completed.');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post(`/goals/${goal.id}/contribute`, {
        amount: numericAmount,
        note,
      });

      const added = Number(response.data?.amount_added || numericAmount);
      const completed = Boolean(response.data?.completed);

      if (typeof onSaved === 'function') {
        await onSaved(response.data);
      }

      window.dispatchEvent(new CustomEvent('budgetmate:goals-updated', {
        detail: { goalId: goal.id, ...response.data },
      }));

      showToast(completed ? `🎉 ${goal.name} goal completed!` : `🎉 ৳${added.toLocaleString()} added to your ${goal.name} goal!`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add money to this goal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add Money" subtitle="Put more toward this savings goal" onClose={onClose}>
      <div className="add-money-goal-summary">
        <div>
          <span>Goal</span>
          <strong>🎯 {goal.name}</strong>
        </div>
        <div>
          <span>Current saved</span>
          <strong>৳{Number(goal.current_saved).toLocaleString()}</strong>
        </div>
        <div>
          <span>Target</span>
          <strong>৳{Number(goal.target_amount).toLocaleString()}</strong>
        </div>
        <div>
          <span>Remaining</span>
          <strong>৳{remaining.toLocaleString()}</strong>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <div className="modal-error">{error}</div>}

        <div className="modal-field">
          <label>Amount to add (৳)</label>
          <input
            type="number"
            min="0.01"
            max={remaining || undefined}
            step="0.01"
            placeholder="e.g. 1000"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            autoFocus
            required
          />
          <small className="add-money-hint">You can add up to ৳{remaining.toLocaleString()}.</small>
        </div>

        <div className="modal-field">
          <label>Note <span className="optional-label">Optional</span></label>
          <input
            type="text"
            maxLength="200"
            placeholder="e.g. Saved from this month's bonus"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        <button className="modal-submit-btn add-money-submit" type="submit" disabled={saving || remaining <= 0}>
          {saving ? 'Adding...' : 'Add Money'}
        </button>
      </form>
    </Modal>
  );
}
