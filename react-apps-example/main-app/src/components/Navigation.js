import React from 'react';
import { appConfig } from '../config';

const Navigation = ({ user, onSignOut }) => {
  const openInNewTab = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <nav className="navigation">
      <div className="nav-links">
        <span className="nav-link" style={{ color: '#28a745', fontWeight: 'bold' }}>
          📍 Main App
        </span>
        <button 
          className="nav-link"
          onClick={() => openInNewTab(appConfig.adminApp)}
          style={{ border: 'none', background: 'none', cursor: 'pointer' }}
        >
          🔧 Admin Portal
        </button>
        <button 
          className="nav-link"
          onClick={() => openInNewTab(`${appConfig.apiApp}/docs`)}
          style={{ border: 'none', background: 'none', cursor: 'pointer' }}
        >
          📚 API Docs
        </button>
      </div>
      
      <div className="user-info-nav">
        <span className="user-email">
          👤 {user?.email || user?.name || 'User'}
        </span>
        <button onClick={onSignOut} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '14px' }}>
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default Navigation;