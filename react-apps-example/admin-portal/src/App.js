import React, { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { cognitoDomain, cognitoConfig, appConfig, adminConfig } from './config';
import TokenManager from './utils/tokenManager';
import AdminDashboard from './components/AdminDashboard';
import Navigation from './components/Navigation';

function App() {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkAuthenticationStatus();
  }, [auth.isAuthenticated, auth.user]);

  const checkAuthenticationStatus = async () => {
    setLoading(true);
    setAuthError(null);

    try {
      let userData = null;

      // Debug: Log current domain and localStorage contents
      console.log('Admin Portal: Current domain:', window.location.origin);
      console.log('Admin Portal: All localStorage keys:', Object.keys(localStorage));
      console.log('Admin Portal: TokenManager storage key:', TokenManager.getStorageKey());
      
      // Check OIDC authentication first
      if (auth.isAuthenticated && auth.user) {
        console.log('Admin Portal: User authenticated via OIDC');
        userData = auth.user;
        TokenManager.storeTokens(auth.user);
      } else {
        // Check stored tokens
        console.log('Admin Portal: Checking stored tokens...');
        const storedTokens = TokenManager.getTokens();
        console.log('Admin Portal: Stored tokens found:', !!storedTokens);
        console.log('Admin Portal: Token details:', storedTokens ? {
          hasAccessToken: !!storedTokens.accessToken,
          hasProfile: !!storedTokens.profile,
          tokenLength: storedTokens.accessToken?.length || 0,
          timestamp: storedTokens.timestamp
        } : 'No tokens');
        
        if (storedTokens && storedTokens.accessToken) {
          const isValid = await TokenManager.validateToken(storedTokens.accessToken);
          console.log('Admin Portal: Token validation result:', isValid);
          
          if (isValid) {
            console.log('Admin Portal: Valid stored tokens found');
            userData = storedTokens;
          } else {
            console.log('Admin Portal: Stored tokens expired');
            TokenManager.clearTokens();
          }
        } else {
          console.log('Admin Portal: No valid tokens in storage');
        }
      }

      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);

        // Check admin access
        const userProfile = userData.profile || userData;
        const userRole = userProfile?.['custom:role'] || userProfile?.role;
        console.log('Admin Portal: User role:', userRole);
        const hasAdmin = adminConfig.requiredRoles.some(role => 
          role.toLowerCase() === userRole?.toLowerCase()
        );
        
        setHasAdminAccess(hasAdmin);
        
        if (!hasAdmin) {
          console.log('Admin Portal: User does not have admin role:', userRole);
        }
      } else {
        console.log('Admin Portal: No user data available');
        setIsAuthenticated(false);
        setHasAdminAccess(false);
      }
    } catch (error) {
      console.error('Admin Portal: Authentication check error:', error);
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    const logoutUrl = `${cognitoDomain}/logout?client_id=${cognitoConfig.client_id}&logout_uri=${encodeURIComponent(window.location.origin)}`;
    
    TokenManager.clearTokens();
    window.location.href = logoutUrl;
  };

  const redirectToMainApp = () => {
    window.location.href = `${appConfig.mainApp}?redirect=${encodeURIComponent(window.location.href)}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="app fade-in">
        <div className="loading">
          <div className="loading-spinner"></div>
          <h2>Loading Admin Portal...</h2>
          <p>Checking authentication and admin privileges...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (authError || auth.error) {
    return (
      <div className="app fade-in">
        <div className="error">
          <h2>Authentication Error</h2>
          <p>{authError || auth.error?.message}</p>
          <div className="button-group">
            <button onClick={redirectToMainApp} className="btn btn-primary">
              Go to Main App
            </button>
            <button onClick={() => window.location.reload()} className="btn btn-secondary">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="app fade-in">
        <header className="admin-header">
          <h1>🔧 Admin Portal</h1>
          <p>Administrative Access Required</p>
        </header>
        
        <main className="app-main">
          <div className="unauthorized">
            <h2>Authentication Required</h2>
            <p>You need to be signed in to access the admin portal.</p>
            
            <div className="button-group">
              <button onClick={redirectToMainApp} className="btn btn-primary">
                Sign In via Main App
              </button>
            </div>
            
            <p className="auth-note">
              You'll be redirected to the main application for authentication, then brought back here automatically.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Authenticated but no admin access
  if (isAuthenticated && !hasAdminAccess) {
    const userProfile = user?.profile || user;
    const currentRole = userProfile?.['custom:role'] || userProfile?.role || 'user';

    return (
      <div className="app fade-in">
        <header className="admin-header">
          <h1>🔧 Admin Portal</h1>
          <p>Access Denied</p>
        </header>
        
        <Navigation 
          user={userProfile}
          onSignOut={handleSignOut}
          showAdminNav={false}
        />
        
        <main className="app-main">
          <div className="access-denied">
            <h2>🚫 Administrative Access Required</h2>
            <p>
              You are signed in as <strong>{userProfile?.email}</strong> with role <strong>{currentRole}</strong>,
              but you don't have the required administrative privileges.
            </p>
            <p>
              Required roles: {adminConfig.requiredRoles.join(', ')}
            </p>
            
            <div className="button-group">
              <a href={appConfig.mainApp} className="btn btn-primary">
                Back to Main App
              </a>
              <button onClick={handleSignOut} className="btn btn-danger">
                Sign Out
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Authenticated with admin access
  const userProfile = user?.profile || user;
  
  return (
    <div className="app fade-in">
      <header className="admin-header">
        <h1>🔧 Admin Portal</h1>
        <p>Administrative Dashboard</p>
      </header>

      <Navigation 
        user={userProfile}
        onSignOut={handleSignOut}
        showAdminNav={true}
      />

      <div className="admin-warning">
        <h3>⚠️ Administrator Access</h3>
        <p>You have administrative privileges. Please use these tools responsibly.</p>
      </div>

      <main className="app-main">
        <AdminDashboard 
          user={userProfile}
          userTokens={user}
        />
      </main>
    </div>
  );
}

export default App;