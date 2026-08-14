import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import api from '../api/axios';
import { notifyDataChanged } from '../context/AlertsContext';

export default function AddBudgetModal({ month, onClose, onSaved }) {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/categories')
      .then((res) => setCategories(res.data.filter((c) => c.type === 'expense')))
      .catch(() => setError('Could not load categories'));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/budgets', {
        category_id: categoryId,
        limit_amount: limitAmount,
        month_year: month,
      });
      onSaved();
      notifyDataChanged();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save budget');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add Budget" subtitle={`Set a spending limit for ${month}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="modal-error">{error}</div>}

        <div className="modal-field">
          <label>Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.group_name ? `${c.group_name} — ${c.name}` : c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="modal-field">
          <label>Limit amount (৳)</label>
          <input
            type="number" step="0.01" min="0" placeholder="e.g. 5000"
            value={limitAmount} onChange={(e) => setLimitAmount(e.target.value)} required
          />
        </div>

        <button className="modal-submit-btn" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Budget'}
        </button>
      </form>
    </Modal>
  );
}
