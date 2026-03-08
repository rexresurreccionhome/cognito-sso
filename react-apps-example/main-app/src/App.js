import React, { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { Routes, Route } from 'react-router-dom';
import { cognitoDomain, cognitoConfig, appConfig, apiConfig } from './config';
import useSubdomainAuth from './hooks/useSubdomainAuth';
import Dashboard from './components/Dashboard';
import Navigation from './components/Navigation';

function App() {
  const auth = useAuth();
  const subdomainAuth = useSubdomainAuth();
  const [apiResponse, setApiResponse] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);

  // Handle redirect parameter for cross-domain navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect');
    
    if (redirectUrl && subdomainAuth.isAuthenticated) {
      // User is authenticated and we have a redirect URL
      setTimeout(() => {
        window.location.href = decodeURIComponent(redirectUrl);
      }, 2000);
    }
  }, [subdomainAuth.isAuthenticated]);

  /**
   * Handle Cognito logout with proper redirect
   */
  const handleSignOut = async () => {
    // Clear tokens and reset app state first
    await subdomainAuth.signOut();
    
    // Then redirect to Cognito logout
    const logoutUrl = `${cognitoDomain}/logout?client_id=${cognitoConfig.client_id}&logout_uri=${encodeURIComponent(window.location.origin)}`;
    window.location.href = logoutUrl;
  };

  /**
   * Test API call with authentication
   */
  const testApiCall = async () => {
    setApiLoading(true);
    setApiResponse(null);

    try {
      const response = await subdomainAuth.makeAuthenticatedRequest(
        `${apiConfig.baseUrl}/api/protected/profile`,
        {
          method: 'GET'
        }
      );

      const data = await response.json();
      
      setApiResponse({
        success: response.ok,
        status: response.status,
        data: data
      });
    } catch (error) {
      setApiResponse({
        success: false,
        error: error.message
      });
    } finally {
      setApiLoading(false);
    }
  };

  // Loading state
  if (auth.isLoading || subdomainAuth.loading) {
    return (
      <div className="app fade-in">
        <div className="loading">
          <div className="loading-spinner"></div>
          <h2>Loading Authentication...</h2>
          <p>Checking your authentication status...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (auth.error) {
    return (
      <div className="app fade-in">
        <div className="error">
          <h2>Authentication Error</h2>
          <p>{auth.error.message}</p>
          <div className="button-group">
            <button onClick={() => window.location.reload()} className="btn btn-primary">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check for redirect scenario
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUrl = urlParams.get('redirect');
  
  if (redirectUrl && subdomainAuth.isAuthenticated) {
    return (
      <div className="app fade-in">
        <div className="loading">
          <h2>Redirecting...</h2>
          <p>You're authenticated! Redirecting you back to:</p>
          <p><strong>{decodeURIComponent(redirectUrl)}</strong></p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  // Authenticated state
  if (subdomainAuth.isAuthenticated) {
    const userInfo = subdomainAuth.getUserInfo();

    return (
      <div className="app fade-in">
        <header className="app-header">
          <h1>🎉 Cognito SSO Main App</h1>
          <p>Successfully authenticated with AWS Cognito!</p>
        </header>

        <Navigation 
          user={userInfo}
          onSignOut={handleSignOut}
        />

        <Routes>
          <Route path="/" element={
            <main className="app-main">
              <Dashboard 
                user={userInfo}
                userTokens={subdomainAuth.user}
                onTestApi={testApiCall}
                apiResponse={apiResponse}
                apiLoading={apiLoading}
              />
            </main>
          } />
        </Routes>
      </div>
    );
  }

  // Not authenticated state
  return (
    <div className="app fade-in">
      <header className="app-header">
        <h1>Cognito SSO Main App</h1>
        <p>Secure Single Sign-On Demo</p>
      </header>
      
      <main className="app-main">
        <div className="auth-actions">
          <h2>Welcome to Cognito SSO Demo</h2>
          <p>This application demonstrates AWS Cognito authentication with cross-subdomain SSO capabilities.</p>
          
          <div className="button-group">
            <button 
              onClick={() => subdomainAuth.signIn()} 
              className="btn btn-primary"
              disabled={subdomainAuth.loading}
            >
              {subdomainAuth.loading ? 'Signing In...' : 'Sign In with Cognito'}
            </button>
          </div>
          
          <p className="auth-note">
            You'll be redirected to AWS Cognito for secure authentication.
            After signing in, you'll be able to access other applications in this domain without re-authenticating.
          </p>

          <div className="cross-domain-section">
            <h3>What you'll be able to access after signing in:</h3>
            <div className="app-links">
              <div className="app-link">
                <h4>Main Application</h4>
                <p>This main app with user dashboard and profile information</p>
              </div>
              <div className="app-link">
                <h4>Admin Portal</h4>
                <p>Administrative interface (requires admin role)</p>
              </div>
              <div className="app-link">
                <h4>Protected API</h4>
                <p>REST API endpoints that validate your JWT tokens</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;