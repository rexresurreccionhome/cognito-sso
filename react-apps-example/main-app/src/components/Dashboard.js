import React from 'react';
import { appConfig } from '../config';

const Dashboard = ({ user, userTokens, onTestApi, apiResponse, apiLoading }) => {
  return (
    <>
      {/* Welcome Section */}
      <div className="welcome-section">
        <h2>Welcome, {user?.name || user?.email}! 🎉</h2>
        <p>You are successfully authenticated and can now access all applications in this domain.</p>
      </div>

      {/* User Information */}
      <div className="user-info">
        <h3>👤 Your Profile Information</h3>
        <ul className="user-info-list">
          <li className="user-info-item">
            <span className="user-info-label">Email:</span>
            <span className="user-info-value">{user?.email}</span>
          </li>
          <li className="user-info-item">
            <span className="user-info-label">Name:</span>
            <span className="user-info-value">{user?.name || 'Not provided'}</span>
          </li>
          <li className="user-info-item">
            <span className="user-info-label">User ID:</span>
            <span className="user-info-value">{user?.sub}</span>
          </li>
          <li className="user-info-item">
            <span className="user-info-label">Email Verified:</span>
            <span className="user-info-value">{user?.email_verified ? '✅ Yes' : '❌ No'}</span>
          </li>
          {user?.['custom:role'] && (
            <li className="user-info-item">
              <span className="user-info-label">Role:</span>
              <span className="user-info-value">{user['custom:role']}</span>
            </li>
          )}
          {user?.phone_number && (
            <li className="user-info-item">
              <span className="user-info-label">Phone:</span>
              <span className="user-info-value">{user.phone_number}</span>
            </li>
          )}
        </ul>
      </div>

      {/* Cross-Domain Applications */}
      <div className="cross-domain-section">
        <h3>🌐 Cross-Domain SSO Applications</h3>
        <p>Click on any application below. You'll be automatically authenticated thanks to SSO!</p>
        
        <div className="app-links">
          <a 
            href={appConfig.adminApp} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="app-link"
          >
            <h4>🔧 Admin Portal</h4>
            <p>Administrative interface with role-based access control</p>
          </a>
          
          <a 
            href={`${appConfig.apiApp}/docs`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="app-link"
          >
            <h4>📚 API Documentation</h4>
            <p>Interactive API documentation and testing interface</p>
          </a>
          
          <a 
            href={appConfig.apiApp} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="app-link"
          >
            <h4>🚀 API Endpoints</h4>
            <p>Protected API endpoints that validate your JWT tokens</p>
          </a>
        </div>
      </div>

      {/* API Testing */}
      <div className="api-testing">
        <h3>🧪 Test Protected API</h3>
        <p>Test making authenticated API calls using your JWT tokens.</p>
        
        <div className="button-group">
          <button 
            onClick={onTestApi}
            className="btn btn-primary"
            disabled={apiLoading}
          >
            {apiLoading ? 'Testing...' : 'Test API Call'}
          </button>
        </div>

        {apiResponse && (
          <div className={`api-response ${apiResponse.success ? 'api-success' : 'api-error'}`}>
            <h4>API Response:</h4>
            <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Token Information (for debugging) */}
      <div className="token-display">
        <h3>🔐 JWT Tokens (Debug Information)</h3>
        <p>These tokens are used for authentication across all applications.</p>
        
        <div className="token-section">
          <h4>ID Token:</h4>
          <textarea 
            className="token-textarea" 
            readOnly 
            value={userTokens?.id_token || userTokens?.idToken || 'Not available'} 
            rows="4" 
          />
        </div>
        
        <div className="token-section">
          <h4>Access Token:</h4>
          <textarea 
            className="token-textarea" 
            readOnly 
            value={userTokens?.access_token || userTokens?.accessToken || 'Not available'} 
            rows="4" 
          />
        </div>

        {userTokens?.refresh_token && (
          <div className="token-section">
            <h4>Refresh Token:</h4>
            <textarea 
              className="token-textarea" 
              readOnly 
              value={userTokens.refresh_token} 
              rows="2" 
            />
          </div>
        )}
        
        <p className="auth-note">
          <strong>Note:</strong> These tokens are automatically included in API requests and shared across subdomains for SSO functionality.
        </p>
      </div>
    </>
  );
};

export default Dashboard;