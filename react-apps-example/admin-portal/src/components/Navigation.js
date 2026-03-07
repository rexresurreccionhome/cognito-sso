import React from 'react';
import { appConfig } from '../config';

const Navigation = ({ user, onSignOut, showAdminNav }) => {
  const openInNewTab = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <nav className="navigation">
      <div className="nav-links">
        <button 
          className="nav-link"
          onClick={() => openInNewTab(appConfig.mainApp)}
          style={{ border: 'none', background: 'none', cursor: 'pointer' }}
        >
          🏠 Main App
        </button>
        
        <span className="nav-link" style={{ color: '#dc3545', fontWeight: 'bold' }}>
          📍 Admin Portal
        </span>
        
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
          👤 {user?.email || user?.name || 'Admin'} 
          {user?.['custom:role'] && (
            <span className="role-badge role-admin" style={{ marginLeft: '8px' }}>
              {user['custom:role']}
            </span>
          )}
        </span>
        <button onClick={onSignOut} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '14px' }}>
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default Navigation;