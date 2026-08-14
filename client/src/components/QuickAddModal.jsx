import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { notifyDataChanged } from '../context/AlertsContext';
import Modal from './Modal';
import './QuickAddModal.css';

const expenseIcons = {
  food: '🍔',
  entertainment: '🎮',
  bills: '💡',
  shopping: '🛍️',
  gadgets: '💻',
  transport: '🚗',
  education: '📚',
  rent: '🏠',
  health: '💊',
  subscriptions: '☕',
  personal: '🏋️',
  travel: '✈️',
};

const incomeIcons = {
  salary: '💼',
  tuition: '🎓',
  freelancing: '💻',
  freelance: '💻',
  business: '🏪',
  gift: '🎁',
  investment: '💵',
  interest: '🏦',
};

function getCategoryIcon(name, type) {
  const normalized = name.toLowerCase();
  const source = type === 'income' ? incomeIcons : expenseIcons;
  const match = Object.entries(source).find(([key]) => normalized.includes(key));
  return match?.[1] || (type === 'income' ? '💰' : '➕');
}

export default function QuickAddModal({ onClose, onSaved }) {
  const showToast = useToast();
  const [type, setType] = useState('expense');
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    category_id: '',
    amount: '',
    note: '',
    txn_date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/categories')
      .then((res) => setCategories(res.data))
      .catch(() => setError('Could not load categories.'));
  }, []);

  const availableCategories = useMemo(() => {
    const filtered = categories.filter((category) => category.type === type);
    const unique = new Map();

    const getKey = (name) => {
      const normalized = String(name || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

      if (['other', 'others', 'other expense', 'other expenses'].includes(normalized)) {
        return 'other-expense';
      }

      return normalized.replace(/[^a-z0-9]+/g, '');
    };

    filtered.forEach((category) => {
      const key = getKey(category.name);
      const existing = unique.get(key);

      if (!existing) {
        unique.set(key, category);
        return;
      }

      if (existing.user_id == null && category.user_id != null) {
        unique.set(key, category);
      }
    });

    return Array.from(unique.values()).map((category) => {
      const normalized = String(category.name || '').trim().toLowerCase();

      if (['other', 'others', 'other expense', 'other expenses'].includes(normalized)) {
        return { ...category, name: 'Other Expense' };
      }

      return category;
    });
  }, [categories, type]);

  const handleClose = () => {
    if (saving || closing) return;
    setClosing(true);
    window.setTimeout(onClose, 180);
  };

  const changeType = (next) => {
    setType(next);
    setForm((prev) => ({ ...prev, category_id: '' }));
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.category_id) {
      setError('Please choose a category.');
      return;
    }

    if (Number(form.amount) <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/transactions', { ...form, type, amount: Number(form.amount) });
      showToast(`${type === 'expense' ? 'Expense' : 'Income'} added successfully ✓`);
      notifyDataChanged();
      await onSaved?.();
      setSaving(false);
      setClosing(true);
      window.setTimeout(onClose, 180);
    } catch (err) {
      setSaving(false);
      setError(err.response?.data?.message || 'Unable to add transaction.');
    }
  };

  return (
    <Modal
      title="Quick Add"
      subtitle="Record a transaction in a few seconds"
      onClose={handleClose}
      closing={closing}
    >
      <form onSubmit={submit} className="quick-add-form">
        <div className="quick-type-toggle">
          <button type="button" className={type === 'income' ? 'active income' : ''} onClick={() => changeType('income')}>
            ↗ Income
          </button>
          <button type="button" className={type === 'expense' ? 'active expense' : ''} onClick={() => changeType('expense')}>
            ↘ Expense
          </button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <div className="quick-amount">
          <span>৳</span>
          <input
            autoFocus
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            required
          />
        </div>

        <div className="quick-category-label">Category</div>
        {availableCategories.length > 0 ? (
          <div className="quick-category-grid">
            {availableCategories.map((category) => {
              const selected = String(form.category_id) === String(category.id);
              return (
                <button
                  type="button"
                  key={category.id}
                  className={`quick-category ${selected ? 'selected' : ''}`}
                  onClick={() => setForm((prev) => ({ ...prev, category_id: category.id }))}
                >
                  <span>{getCategoryIcon(category.name, type)}</span>
                  <small>{category.name}</small>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="quick-category-empty">No {type} categories are available.</div>
        )}

        <div className="quick-fields">
          <div className="modal-field">
            <label>Date</label>
            <input
              type="date"
              value={form.txn_date}
              onChange={(e) => setForm((prev) => ({ ...prev, txn_date: e.target.value }))}
              required
            />
          </div>
          <div className="modal-field">
            <label>Note <em>Optional</em></label>
            <input
              type="text"
              maxLength="255"
              placeholder="e.g. Lunch with friends"
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            />
          </div>
        </div>

        <button className={`modal-submit-btn quick-submit ${type}`} type="submit" disabled={saving || closing}>
          {saving ? 'Adding...' : `Add ${type === 'expense' ? 'Expense' : 'Income'}`}
        </button>
      </form>
    </Modal>
  );
}
