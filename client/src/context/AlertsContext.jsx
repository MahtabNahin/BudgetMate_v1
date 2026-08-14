import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const AlertsContext = createContext(null);

export function AlertsProvider({ children }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [topAlerts, setTopAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const month = new Date().toISOString().slice(0, 7);
      const res = await api.get('/alerts', { params: { month } });
      setAlerts(res.data.alerts || []);
      setTopAlerts(res.data.top_alerts || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error('Alerts fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setAlerts([]);
      setTopAlerts([]);
      setUnreadCount(0);
      return;
    }
    refresh();

    // Any part of the app that mutates transactions/budgets/goals dispatches this
    // event, so alerts recompute from the same underlying data automatically.
    const handleDataUpdate = () => refresh();
    window.addEventListener('budgetmate:data-updated', handleDataUpdate);
    window.addEventListener('budgetmate:goals-updated', handleDataUpdate);

    return () => {
      window.removeEventListener('budgetmate:data-updated', handleDataUpdate);
      window.removeEventListener('budgetmate:goals-updated', handleDataUpdate);
    };
  }, [user, refresh]);

  const markRead = async (key) => {
    setAlerts((prev) => prev.map((a) => (a.key === key ? { ...a, status: 'read' } : a)));
    setTopAlerts((prev) => prev.map((a) => (a.key === key ? { ...a, status: 'read' } : a)));
    setUnreadCount((prev) => Math.max(prev - 1, 0));
    try {
      await api.post(`/alerts/${encodeURIComponent(key)}/read`);
    } catch (err) {
      console.error('Mark read error:', err);
      refresh();
    }
  };

  const markAllRead = async () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, status: 'read' })));
    setTopAlerts((prev) => prev.map((a) => ({ ...a, status: 'read' })));
    setUnreadCount(0);
    try {
      await api.post('/alerts/read-all', { month: new Date().toISOString().slice(0, 7) });
    } catch (err) {
      console.error('Mark all read error:', err);
      refresh();
    }
  };

  const dismiss = async (key) => {
    const wasUnread = alerts.find((a) => a.key === key)?.status === 'unread';
    setAlerts((prev) => prev.filter((a) => a.key !== key));
    setTopAlerts((prev) => prev.filter((a) => a.key !== key));
    if (wasUnread) setUnreadCount((prev) => Math.max(prev - 1, 0));
    try {
      await api.post(`/alerts/${encodeURIComponent(key)}/dismiss`);
    } catch (err) {
      console.error('Dismiss error:', err);
      refresh();
    }
  };

  return (
    <AlertsContext.Provider value={{ alerts, topAlerts, unreadCount, loading, refresh, markRead, markAllRead, dismiss }}>
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  return useContext(AlertsContext);
}

// Call this after any action that changes transactions, budgets, or goals so every
// part of the app (bell icon, dashboard card, notification panel) refreshes in sync.
export function notifyDataChanged() {
  window.dispatchEvent(new CustomEvent('budgetmate:data-updated'));
}
