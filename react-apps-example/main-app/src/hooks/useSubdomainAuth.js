import { useState, useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import TokenManager from '../utils/tokenManager';

/**
 * Custom hook for cross-subdomain authentication
 * Handles token storage and validation across different subdomains
 */
const useSubdomainAuth = () => {
  const auth = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuthentication();
  }, [auth.isAuthenticated, auth.user]);

  /**
   * Check authentication status from both OIDC context and stored tokens
   */
  const checkAuthentication = async () => {
    try {
      setLoading(true);
      setError(null);

      // If OIDC context shows authenticated user
      if (auth.isAuthenticated && auth.user) {
        console.log('User authenticated via OIDC context');
        setUser(auth.user);
        setIsAuthenticated(true);
        
        // Store tokens for cross-subdomain sharing
        TokenManager.storeTokens(auth.user);
      } else {
        // Check if we have valid stored tokens
        await checkStoredTokens();
      }
    } catch (error) {
      console.error('Authentication check error:', error);
      setError(error.message);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check stored tokens for authentication
   */
  const checkStoredTokens = async () => {
    console.log('Checking stored tokens...');
    const storedTokens = TokenManager.getTokens();
    
    if (storedTokens && storedTokens.accessToken) {
      const isValid = await TokenManager.validateToken(storedTokens.accessToken);
      
      if (isValid) {
        console.log('Valid tokens found in storage');
        setUser(storedTokens);
        setIsAuthenticated(true);
      } else {
        console.log('Tokens expired, clearing storage');
        TokenManager.clearTokens();
        setIsAuthenticated(false);
      }
    } else {
      console.log('No stored tokens found');
      setIsAuthenticated(false);
    }
  };

  /**
   * Redirect to main app for authentication
   * Useful for cross-subdomain scenarios
   */
  const redirectToAuth = (returnUrl = null) => {
    const redirectUrl = returnUrl || window.location.href;
    const mainAppUrl = process.env.REACT_APP_MAIN_APP_URL || window.location.origin;
    window.location.href = `${mainAppUrl}?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  /**
   * Sign in using OIDC
   */
  const signIn = async () => {
    try {
      setError(null);
      await auth.signinRedirect();
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error.message);
    }
  };

  /**
   * Sign out and clear all tokens
   */
  const signOut = async () => {
    try {
      setError(null);
      
      // Clear stored tokens first
      TokenManager.clearTokens();
      
      // Sign out from OIDC if available
      if (auth.removeUser) {
        await auth.removeUser();
      }
      
      // Reset state
      setUser(null);
      setIsAuthenticated(false);
      
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      setError(error.message);
    }
  };

  /**
   * Make authenticated API call
   */
  const makeAuthenticatedRequest = async (url, options = {}) => {
    const authHeaders = TokenManager.getAuthHeaders();
    
    if (!authHeaders.Authorization) {
      throw new Error('No access token available');
    }

    // Check token validity before making request
    const isValid = await TokenManager.areStoredTokensValid();
    if (!isValid) {
      throw new Error('Token expired');
    }

    return fetch(url, {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers
      }
    });
  };

  /**
   * Get user information
   */
  const getUserInfo = () => {
    if (auth.user?.profile) {
      return auth.user.profile;
    }
    return TokenManager.getUserProfile();
  };

  return {
    // Authentication state
    isAuthenticated,
    user,
    loading,
    error,
    
    // User information
    getUserInfo,
    
    // Authentication methods
    signIn,
    signOut,
    redirectToAuth,
    
    // Token management
    getTokens: TokenManager.getTokens,
    clearTokens: TokenManager.clearTokens,
    
    // API utilities
    makeAuthenticatedRequest,
    getAuthHeaders: TokenManager.getAuthHeaders,
    
    // Validation
    validateStoredTokens: TokenManager.areStoredTokensValid
  };
};

export default useSubdomainAuth;