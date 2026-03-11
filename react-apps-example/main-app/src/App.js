import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { cognitoDomain, cognitoConfig, appConfig, apiConfig } from './config';
import { tokenManagerInstance } from './utils/tokenManager';
import Dashboard from './components/Dashboard';
import Navigation from './components/Navigation';
import AuthSelection from './components/AuthSelection';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);

  // Initialize authentication state
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        const authenticated = await tokenManagerInstance.isAuthenticated();
        
        if (authenticated) {
          const currentUser = await tokenManagerInstance.getCurrentUser();
          const tokens = await tokenManagerInstance.getCurrentSession();
          
          setIsAuthenticated(true);
          setUser(currentUser);
          
          console.log('Main App: User authenticated:', currentUser);
          console.log('Main App: Tokens available:', !!tokens);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Main App: Auth check error:', error);
        setError(error.message);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Handle redirect parameter for cross-domain navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect');
    
    console.log('Main App: Checking redirect parameter');
    console.log('Main App: Redirect URL from params:', redirectUrl);
    console.log('Main App: Is authenticated:', isAuthenticated);
    
    if (redirectUrl && isAuthenticated) {
      // User is authenticated and we have a redirect URL
      console.log('Main App: User authenticated, will redirect to:', decodeURIComponent(redirectUrl));
      // Give user a moment to see the success message, then redirect
      setTimeout(() => {
        console.log('Main App: Executing redirect now');
        window.location.href = decodeURIComponent(redirectUrl);
      }, 3000); // Increased delay to 3 seconds
    }
  }, [isAuthenticated]);

  /**
   * Handle Cognito logout with proper redirect
   */
  const handleSignOut = async () => {
    try {
      // Clear tokens and reset app state first
      await tokenManagerInstance.signOut();
      
      // Update local state
      setIsAuthenticated(false);
      setUser(null);
      setApiResponse(null);
      
      // Then redirect to Cognito logout
      const logoutUrl = `${cognitoDomain}/logout?client_id=${cognitoConfig.client_id}&logout_uri=${encodeURIComponent(window.location.origin)}`;
      window.location.href = logoutUrl;
    } catch (error) {
      console.error('Main App: Sign out error:', error);
      setError(error.message);
    }
  };

  /**
   * Test API call with authentication
   */
  const testApiCall = async () => {
    setApiLoading(true);
    setApiResponse(null);

    try {
      console.log('Main App: Making API call to:', `${apiConfig.baseUrl}/api/protected/profile`);
      
      // Get current tokens
      const tokens = await tokenManagerInstance.getCurrentSession();
      if (!tokens?.accessToken) {
        throw new Error('No access token available');
      }
      
      const response = await fetch(`${apiConfig.baseUrl}/api/protected/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Main App: API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Main App: API error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      setApiResponse({
        success: response.ok,
        status: response.status,
        data: data
      });
    } catch (error) {
      console.error('Main App: API call error:', error);
      setApiResponse({
        success: false,
        error: error.message,
        details: {
          name: error.name,
          stack: error.stack
        }
      });
    } finally {
      setApiLoading(false);
    }
  };

  // Loading state
  if (loading) {
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
  if (error) {
    return (
      <div className="app fade-in">
        <div className="error">
          <h2>Authentication Error</h2>
          <p>{error}</p>
          <div className="button-group">
            <button onClick={() => window.location.reload()} className="btn btn-primary">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check for redirect scenario - only show redirect screen if user is authenticated
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUrl = urlParams.get('redirect');
  
  if (redirectUrl && isAuthenticated) {
    return (
      <div className="app fade-in">
        <div className="loading">
          <h2>✅ Authentication Successful!</h2>
          <p>Redirecting you back to:</p>
          <p><strong>{decodeURIComponent(redirectUrl)}</strong></p>
          <div className="loading-spinner"></div>
          <p className="auth-note">
            You will be redirected automatically in a few seconds...
          </p>
        </div>
      </div>
    );
  }

  // Authenticated state
  if (isAuthenticated && user) {
    return (
      <div className="app fade-in">
        <header className="app-header">
          <Navigation 
            user={user}
            onSignOut={handleSignOut}
          />
        </header>
        
        <main className="app-main">
          <Routes>
            <Route path="/" element={
              <Dashboard 
                user={user}
                onTestApi={testApiCall}
                apiResponse={apiResponse}
                apiLoading={apiLoading}
              />
            } />
          </Routes>
        </main>
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
        <AuthSelection 
          onAuthMethodSelect={async (method) => {
            console.log('Main App: Authentication method selected:', method);
            // The authentication will be handled by the AuthSelection component
            // We just need to refresh our auth state after successful auth
            setTimeout(async () => {
              try {
                const authenticated = await tokenManagerInstance.isAuthenticated();
                if (authenticated) {
                  const currentUser = await tokenManagerInstance.getCurrentUser();
                  setIsAuthenticated(true);
                  setUser(currentUser);
                }
              } catch (error) {
                console.error('Main App: Post-auth check error:', error);
              }
            }, 1000);
          }}
          onError={(error) => {
            console.error('Main App: Authentication error:', error);
            setError(error.message || 'Authentication failed');
          }}
        />
      </main>
    </div>
  );
}

export default App;