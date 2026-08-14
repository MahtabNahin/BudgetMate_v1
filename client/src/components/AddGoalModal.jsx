import React, { useState } from 'react';
import Modal from './Modal';
import api from '../api/axios';
import { notifyDataChanged } from '../context/AlertsContext';

export default function AddGoalModal({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/goals', {
        name,
        target_amount: targetAmount,
        target_date: targetDate,
      });
      onSaved();
      notifyDataChanged();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save goal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add Savings Goal" subtitle="Give it a name, target, and date" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="modal-error">{error}</div>}

        <div className="modal-field">
          <label>Goal name</label>
          <input
            type="text" placeholder="e.g. Laptop, Emergency Fund"
            value={name} onChange={(e) => setName(e.target.value)} required
          />
        </div>

        <div className="modal-field">
          <label>Target amount (৳)</label>
          <input
            type="number" step="0.01" min="0" placeholder="e.g. 50000"
            value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} required
          />
        </div>

        <div className="modal-field">
          <label>Target date</label>
          <input
            type="date" value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)} required
          />
        </div>

        <button className="modal-submit-btn" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Goal'}
        </button>
      </form>
    </Modal>
  );
}
