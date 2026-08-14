import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) => 'nav-link' + (isActive ? ' active' : '');

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">৳</span>
        BudgetMate
      </div>

      <div className="navbar-links">
        <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
        <NavLink to="/transactions" className={navLinkClass}>Transactions</NavLink>
        <NavLink to="/budgets" className={navLinkClass}>Budgets</NavLink>
        <NavLink to="/goals" className={navLinkClass}>Goals</NavLink>
        <NavLink to="/simulator" className={navLinkClass}>Simulator</NavLink>
        {user.role === 'admin' && <NavLink to="/admin" className={navLinkClass}>Admin</NavLink>}
      </div>

      <div className="navbar-right">
        <NotificationBell />
        <div className="navbar-user">
          <span className="user-avatar">{user.name.charAt(0).toUpperCase()}</span>
          <span className="user-name">Hi, {user.name}</span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
