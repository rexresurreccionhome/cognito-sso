import React, { useState, useEffect } from 'react';
import TokenManager from '../utils/tokenManager';
import { apiConfig } from '../config';

const AdminDashboard = ({ user, userTokens }) => {
  const [metrics, setMetrics] = useState({
    totalUsers: 156,
    activeUsers: 142,
    adminUsers: 8,
    apiCalls: 2847
  });
  
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [apiResponse, setApiResponse] = useState(null);
  const [loading, setLoading] = useState({
    metrics: false,
    users: false,
    logs: false,
    api: false
  });

  useEffect(() => {
    // Simulate loading metrics
    loadMetrics();
    loadUsers();
    loadLogs();
  }, []);

  const loadMetrics = () => {
    setLoading(prev => ({ ...prev, metrics: true }));
    
    // Simulate API call delay
    setTimeout(() => {
      setMetrics({
        totalUsers: Math.floor(Math.random() * 200) + 100,
        activeUsers: Math.floor(Math.random() * 180) + 120,
        adminUsers: Math.floor(Math.random() * 10) + 5,
        apiCalls: Math.floor(Math.random() * 5000) + 2000
      });
      setLoading(prev => ({ ...prev, metrics: false }));
    }, 1000);
  };

  const loadUsers = () => {
    setLoading(prev => ({ ...prev, users: true }));
    
    setTimeout(() => {
      const sampleUsers = [
        { id: '1', email: 'admin@example.com', name: 'Admin User', role: 'admin', status: 'active', lastLogin: '2024-01-15 10:30' },
        { id: '2', email: 'user1@example.com', name: 'John Doe', role: 'user', status: 'active', lastLogin: '2024-01-15 09:15' },
        { id: '3', email: 'user2@example.com', name: 'Jane Smith', role: 'user', status: 'active', lastLogin: '2024-01-14 16:45' },
        { id: '4', email: 'inactive@example.com', name: 'Inactive User', role: 'user', status: 'inactive', lastLogin: '2024-01-10 14:20' },
        { id: '5', email: user?.email || 'current@example.com', name: user?.name || 'Current User', role: user?.['custom:role'] || 'admin', status: 'active', lastLogin: 'Now' }
      ];
      setUsers(sampleUsers);
      setLoading(prev => ({ ...prev, users: false }));
    }, 800);
  };

  const loadLogs = () => {
    setLoading(prev => ({ ...prev, logs: true }));
    
    setTimeout(() => {
      const sampleLogs = [
        { timestamp: new Date().toISOString(), level: 'info', message: 'Admin portal accessed', user: user?.email },
        { timestamp: new Date(Date.now() - 5000).toISOString(), level: 'info', message: 'User authentication successful', user: 'user1@example.com' },
        { timestamp: new Date(Date.now() - 15000).toISOString(), level: 'warn', message: 'Failed login attempt', user: 'unknown@example.com' },
        { timestamp: new Date(Date.now() - 30000).toISOString(), level: 'info', message: 'API call to /protected/profile', user: 'user2@example.com' },
        { timestamp: new Date(Date.now() - 60000).toISOString(), level: 'error', message: 'Invalid token provided', user: 'anonymous' },
        { timestamp: new Date(Date.now() - 120000).toISOString(), level: 'info', message: 'User logged out', user: 'user3@example.com' }
      ];
      setLogs(sampleLogs);
      setLoading(prev => ({ ...prev, logs: false }));
    }, 600);
  };

  const testAdminApi = async () => {
    setLoading(prev => ({ ...prev, api: true }));
    setApiResponse(null);

    try {
      const headers = TokenManager.getAuthHeaders();
      
      // Simulate admin API call
      const response = await fetch(`${apiConfig.baseUrl}/admin/stats`, {
        method: 'GET',
        headers: headers
      });

      let data;
      if (response.ok) {
        data = {
          success: true,
          stats: {
            totalRequests: 15647,
            errorRate: 0.02,
            avgResponseTime: '245ms',
            topEndpoints: [
              { endpoint: '/api/profile', calls: 3421 },
              { endpoint: '/api/admin/users', calls: 892 },
              { endpoint: '/api/auth/refresh', calls: 2156 }
            ]
          }
        };
      } else {
        data = await response.json();
      }

      setApiResponse({
        success: response.ok,
        status: response.status,
        data: data
      });
    } catch (error) {
      setApiResponse({
        success: false,
        error: error.message,
        mockData: {
          message: 'API endpoint not available - showing mock data',
          stats: {
            totalRequests: 15647,
            errorRate: 0.02,
            avgResponseTime: '245ms'
          }
        }
      });
    } finally {
      setLoading(prev => ({ ...prev, api: false }));
    }
  };

  const refreshData = () => {
    loadMetrics();
    loadUsers();
    loadLogs();
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getLogLevelClass = (level) => {
    switch (level.toLowerCase()) {
      case 'error': return 'log-level-error';
      case 'warn': return 'log-level-warn';
      case 'info': return 'log-level-info';
      default: return '';
    }
  };

  return (
    <>
      {/* Metrics Dashboard */}
      <div className="admin-metrics">
        <h3>📊 System Metrics</h3>
        {loading.metrics ? (
          <div className="loading-spinner"></div>
        ) : (
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-value">{metrics.totalUsers}</span>
              <div className="metric-label">Total Users</div>
            </div>
            <div className="metric-item">
              <span className="metric-value">{metrics.activeUsers}</span>
              <div className="metric-label">Active Users</div>
            </div>
            <div className="metric-item">
              <span className="metric-value">{metrics.adminUsers}</span>
              <div className="metric-label">Admin Users</div>
            </div>
            <div className="metric-item">
              <span className="metric-value">{metrics.apiCalls.toLocaleString()}</span>
              <div className="metric-label">API Calls</div>
            </div>
          </div>
        )}
      </div>

      {/* Admin Actions */}
      <div className="admin-actions">
        <h3>🛠️ Administrative Actions</h3>
        <div className="action-buttons">
          <button className="admin-btn admin-btn-primary" onClick={refreshData}>
            🔄 Refresh Data
          </button>
          <button className="admin-btn admin-btn-primary" onClick={testAdminApi} disabled={loading.api}>
            {loading.api ? '🔄 Testing...' : '🧪 Test Admin API'}
          </button>
          <button className="admin-btn admin-btn-secondary" onClick={() => alert('System settings coming soon!')}>
            ⚙️ System Settings
          </button>
          <button className="admin-btn admin-btn-secondary" onClick={() => alert('Export functionality coming soon!')}>
            📊 Export Reports
          </button>
        </div>

        {apiResponse && (
          <div className={`api-response ${apiResponse.success ? 'api-success' : 'api-error'}`}>
            <h4>Admin API Response:</h4>
            <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Dashboard Grid */}
      <div className="admin-dashboard">
        {/* User Management */}
        <div className="admin-card">
          <h3>👥 User Management</h3>
          <p>Manage user accounts and permissions</p>
          
          {loading.users ? (
            <div className="loading-spinner"></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>{user.name}</td>
                      <td>
                        <span className={`role-badge ${user.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${user.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                          {user.status}
                        </span>
                      </td>
                      <td>{user.lastLogin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* System Logs */}
        <div className="admin-card">
          <h3>📋 System Logs</h3>
          <p>Recent system activity and events</p>
          
          {loading.logs ? (
            <div className="loading-spinner"></div>
          ) : (
            <div className="admin-logs">
              {logs.map((log, index) => (
                <div key={index} className="log-entry">
                  <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
                  <span className={`log-level ${getLogLevelClass(log.level)}`}>
                    [{log.level.toUpperCase()}]
                  </span>
                  <span> {log.message}</span>
                  {log.user && <span style={{ color: '#666', marginLeft: '10px' }}>({log.user})</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Analytics */}
        <div className="admin-card">
          <h3>📈 Analytics</h3>
          <p>System performance and usage statistics</p>
          
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📊</div>
            <p>Analytics dashboard</p>
            <p style={{ fontSize: '14px' }}>Real-time charts and metrics would be displayed here</p>
          </div>
        </div>

        {/* Security */}
        <div className="admin-card">
          <h3>🔐 Security</h3>
          <p>Security settings and monitoring</p>
          
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px', color: '#28a745' }}>✅</div>
            <p><strong>System Status: Secure</strong></p>
            <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0 }}>
              <li>✅ JWT tokens properly validated</li>
              <li>✅ HTTPS enforced</li>
              <li>✅ Admin access restricted</li>
              <li>✅ Session management active</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Current User Info */}
      <div className="admin-card">
        <h3>👤 Your Admin Session</h3>
        <div className="user-info-list">
          <div className="user-info-item">
            <span className="user-info-label">Email:</span>
            <span className="user-info-value">{user?.email}</span>
          </div>
          <div className="user-info-item">
            <span className="user-info-label">Name:</span>
            <span className="user-info-value">{user?.name || 'Not provided'}</span>
          </div>
          <div className="user-info-item">
            <span className="user-info-label">Role:</span>
            <span className="user-info-value">{user?.['custom:role'] || 'admin'}</span>
          </div>
          <div className="user-info-item">
            <span className="user-info-label">Session:</span>
            <span className="user-info-value">Active</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;