import React, { useState, useEffect } from 'react';
import { featureFlags, authMethods } from '../config';
import { tokenManagerInstance } from '../utils/tokenManager';
import './AuthSelection.css';

const AuthSelection = ({ onAuthMethodSelect, onError }) => {
  const [selectedMethod, setSelectedMethod] = useState(authMethods.NATIVE_COGNITO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load user's preferred method
    const preferredMethod = tokenManagerInstance.getAuthMethod();
    setSelectedMethod(preferredMethod);
  }, []);

  const handleSignIn = async (method) => {
    setLoading(true);
    setError(null);
    
    try {
      await tokenManagerInstance.signIn(method);
      onAuthMethodSelect && onAuthMethodSelect(method);
    } catch (error) {
      console.error('Authentication error:', error);
      const errorMessage = error.message || 'Authentication failed';
      setError(errorMessage);
      onError && onError(error);
    } finally {
      setLoading(false);
    }
  };

  const renderNativeOption = () => (
    <div className="auth-option">
      <div className="auth-option-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="auth-option-content">
        <h3>Native Authentication</h3>
        <p>Sign in with your username and password</p>
        <button
          onClick={() => handleSignIn(authMethods.NATIVE_COGNITO)}
          disabled={loading}
          className="auth-button native-auth"
        >
          {loading && selectedMethod === authMethods.NATIVE_COGNITO ? (
            <>
              <span className="loading-spinner"></span>
              Signing in...
            </>
          ) : (
            'Sign In with Email'
          )}
        </button>
      </div>
    </div>
  );

  const renderExternalOption = () => (
    <div className="auth-option">
      <div className="auth-option-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="auth-option-content">
        <h3>Single Sign-On</h3>
        <p>Sign in with your corporate account or social media</p>
        <button
          onClick={() => handleSignIn(authMethods.EXTERNAL_IDP)}
          disabled={loading}
          className="auth-button external-auth"
        >
          {loading && selectedMethod === authMethods.EXTERNAL_IDP ? (
            <>
              <span className="loading-spinner"></span>
              Redirecting...
            </>
          ) : (
            'Sign In with SSO'
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="auth-selection">
      <div className="auth-header">
        <h1>Welcome</h1>
        <p>Choose your preferred sign-in method to continue</p>
      </div>

      {error && (
        <div className="auth-error">
          <div className="auth-error-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
              <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="auth-error-message">
            {error}
          </div>
        </div>
      )}

      <div className="auth-options">
        {renderNativeOption()}
        
        {featureFlags.USE_EXTERNAL_IDP && (
          <>
            <div className="auth-divider">
              <span>or</span>
            </div>
            {renderExternalOption()}
          </>
        )}
      </div>

      <div className="auth-footer">
        <p>
          By signing in, you agree to our{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
        </p>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="auth-debug">
          <details>
            <summary>Debug Information</summary>
            <pre>
              {JSON.stringify({
                featureFlags,
                selectedMethod,
                loading,
                error,
              }, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default AuthSelection;