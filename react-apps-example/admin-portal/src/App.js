import React, { useEffect, useState } from 'react';
import { cognitoDomain, cognitoConfig, appConfig, adminConfig } from './config';
import TokenManager, { tokenManagerInstance } from './utils/tokenManager';
import AdminDashboard from './components/AdminDashboard';
import Navigation from './components/Navigation';
import AuthSelection from './components/AuthSelection';

function App() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkAuthenticationStatus();
  }, []);

  const checkAuthenticationStatus = async () => {
    setLoading(true);
    setAuthError(null);

    try {
      console.log('Admin Portal: Current domain:', window.location.origin);

      const authenticated = await tokenManagerInstance.isAuthenticated();
      console.log('Admin Portal: Is authenticated:', authenticated);

      if (authenticated) {
        const currentUser = await tokenManagerInstance.getCurrentUser();
        await tokenManagerInstance.getCurrentSession();

        console.log('Admin Portal: User:', currentUser);

        setUser(currentUser);
        setIsAuthenticated(true);

        // Check admin access via Cognito custom:role attribute
        const userRole = currentUser?.attributes?.['custom:role'] || currentUser?.attributes?.role;
        console.log('Admin Portal: User role:', userRole);

        const hasAdmin = adminConfig.requiredRoles.some(role =>
          role.toLowerCase() === userRole?.toLowerCase()
        );
        setHasAdminAccess(hasAdmin);

        if (!hasAdmin) {
          console.log('Admin Portal: User does not have admin role:', userRole);
        }
      } else {
        // Fallback: check legacy stored tokens for cross-subdomain SSO
        const storedTokens = TokenManager.getTokens();
        if (storedTokens?.accessToken) {
          const isValid = await TokenManager.validateToken(storedTokens.accessToken);
          if (isValid) {
            console.log('Admin Portal: Valid legacy stored tokens found');
            const userProfile = storedTokens.profile || storedTokens;
            const userRole = userProfile?.['custom:role'] || userProfile?.role;
            const hasAdmin = adminConfig.requiredRoles.some(role =>
              role.toLowerCase() === userRole?.toLowerCase()
            );
            setUser(userProfile);
            setIsAuthenticated(true);
            setHasAdminAccess(hasAdmin);
          } else {
            TokenManager.clearTokens();
            setIsAuthenticated(false);
            setHasAdminAccess(false);
          }
        } else {
          setIsAuthenticated(false);
          setHasAdminAccess(false);
        }
      }
    } catch (error) {
      console.error('Admin Portal: Authentication check error:', error);
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await tokenManagerInstance.signOut();
    } catch (error) {
      // Fallback: clear tokens manually
      TokenManager.clearTokens();
    }
    const logoutUrl = `${cognitoDomain}/logout?client_id=${cognitoConfig.client_id}&logout_uri=${encodeURIComponent(window.location.origin)}`;
    window.location.href = logoutUrl;
  };

  const redirectToMainApp = () => {
    const currentUrl = window.location.href;
    const mainAppUrl = appConfig.mainApp;
    
    console.log('Admin Portal: Redirecting to main app');
    console.log('Admin Portal: Current URL:', currentUrl);
    console.log('Admin Portal: Main app URL:', mainAppUrl);
    
    const redirectUrl = `${mainAppUrl}?redirect=${encodeURIComponent(currentUrl)}`;
    console.log('Admin Portal: Full redirect URL:', redirectUrl);
    
    window.location.href = redirectUrl;
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
  if (authError) {
    return (
      <div className="app fade-in">
        <div className="error">
          <h2>Authentication Error</h2>
          <p>{authError}</p>
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
        <main className="app-main">
          <AuthSelection
            onAuthMethodSelect={async (method) => {
              console.log('Admin Portal: Authentication method selected:', method);
              setTimeout(async () => {
                try {
                  await checkAuthenticationStatus();
                } catch (error) {
                  console.error('Admin Portal: Post-auth check error:', error);
                }
              }, 1000);
            }}
            onError={(error) => {
              console.error('Admin Portal: Authentication error:', error);
              setAuthError(error.message || 'Authentication failed');
            }}
          />
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