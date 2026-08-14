import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlerts } from '../context/AlertsContext';
import './AlertItem.css';

export default function AlertItem({ alert, compact = false }) {
  const navigate = useNavigate();
  const { markRead, dismiss } = useAlerts();

  const handleAction = () => {
    if (alert.status === 'unread') markRead(alert.key);
    if (alert.action?.to) navigate(alert.action.to);
  };

  return (
    <div className={`alert-item severity-${alert.severity} ${alert.status === 'unread' ? 'unread' : ''} ${compact ? 'compact' : ''}`}>
      <div className="alert-item-icon">{alert.icon}</div>
      <div className="alert-item-body">
        <div className="alert-item-top">
          <strong>{alert.title}</strong>
          {alert.status === 'unread' && <span className="alert-dot" title="Unread" />}
        </div>
        <p className="alert-item-message">{alert.message}</p>
        {alert.detail && !compact && <p className="alert-item-detail">{alert.detail}</p>}
        <div className="alert-item-actions">
          {alert.action && (
            <button className="alert-action-btn" onClick={handleAction}>{alert.action.label} →</button>
          )}
          {alert.status === 'unread' && (
            <button className="alert-mark-read-btn" onClick={() => markRead(alert.key)}>Mark read</button>
          )}
          <button className="alert-dismiss-btn" onClick={() => dismiss(alert.key)} title="Dismiss">✕</button>
        </div>
      </div>
    </div>
  );
}
