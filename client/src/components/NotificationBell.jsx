import React, { useEffect, useRef, useState } from 'react';
import { useAlerts } from '../context/AlertsContext';
import AlertItem from './AlertItem';
import './NotificationBell.css';

export default function NotificationBell() {
  const { alerts, unreadCount, markAllRead } = useAlerts();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="notification-bell-wrap" ref={panelRef}>
      <button className="notification-bell-btn" onClick={() => setOpen((prev) => !prev)} aria-label="Notifications">
        🔔
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <strong>Notifications</strong>
            {alerts.some((a) => a.status === 'unread') && (
              <button className="mark-all-read-btn" onClick={markAllRead}>Mark all read</button>
            )}
          </div>

          <div className="notification-panel-body">
            {alerts.length === 0 ? (
              <div className="notification-empty">
                <span>✨</span>
                <p>You're all caught up!</p>
                <small>No important financial alerts right now.</small>
              </div>
            ) : (
              alerts.map((alert) => <AlertItem key={alert.key} alert={alert} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
