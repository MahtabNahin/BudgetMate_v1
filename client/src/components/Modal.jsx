import React, { useEffect } from 'react';
import './Modal.css';

export default function Modal({ title, subtitle, onClose, children, closing = false }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className={`modal-overlay ${closing ? 'is-closing' : ''}`} onClick={onClose}>
      <div className={`modal-box ${closing ? 'is-closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
