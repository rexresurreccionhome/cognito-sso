import { Auth } from 'aws-amplify';
import { cognitoConfig, cognitoDomain, featureFlags, authMethods } from '../config';

/**
 * Enhanced Token Manager Utility - Admin Portal Version
 * Handles authentication for both native Cognito and external IDPs
 */
class TokenManager {
  static STORAGE_KEY = 'cognitoTokens';
  static TOKEN_DATA_KEY = 'cognitoTokenData';
  static AUTH_METHOD_KEY = 'preferredAuthMethod';

  constructor() {
    this.tokens = null;
    this.authMethod = null;
    this.init();
  }

  init() {
    // Configure Amplify Auth
    Auth.configure({
      Auth: {
        region: this.extractRegionFromAuthority(cognitoConfig.authority),
        userPoolId: this.extractUserPoolIdFromAuthority(cognitoConfig.authority),
        userPoolWebClientId: cognitoConfig.client_id,
        oauth: {
          domain: cognitoDomain.replace('https://', ''),
          scope: cognitoConfig.scope.split(' '),
          redirectSignIn: cognitoConfig.redirect_uri,
          redirectSignOut: cognitoConfig.post_logout_redirect_uri,
          responseType: cognitoConfig.response_type,
        }
      }
    });
  }

  // Determine authentication method based on feature flags and user preference
  getAuthMethod() {
    if (!featureFlags.USE_EXTERNAL_IDP) {
      return authMethods.NATIVE_COGNITO;
    }
    
    // Check user preference from localStorage
    const userPreference = localStorage.getItem(TokenManager.AUTH_METHOD_KEY);
    return userPreference || authMethods.NATIVE_COGNITO;
  }

  // Set user's preferred authentication method
  setAuthMethod(method) {
    this.authMethod = method;
    localStorage.setItem(TokenManager.AUTH_METHOD_KEY, method);
  }

  // Enhanced sign in with method selection
  async signIn(method = null) {
    try {
      const selectedMethod = method || this.getAuthMethod();
      this.setAuthMethod(selectedMethod);

      if (selectedMethod === authMethods.EXTERNAL_IDP && featureFlags.USE_EXTERNAL_IDP) {
        // Use external IDP (Auth0) through Cognito federation
        return await this.signInWithExternalIDP();
      } else {
        // Use native Cognito authentication
        return await this.signInWithCognito();
      }
    } catch (error) {
      console.error('Admin Portal: Sign in error:', error);
      throw error;
    }
  }

  // Native Cognito sign in
  async signInWithCognito() {
    try {
      return await Auth.federatedSignIn();
    } catch (error) {
      console.error('Admin Portal: Native Cognito sign in error:', error);
      throw error;
    }
  }

  // External IDP (Auth0) sign in through Cognito
  async signInWithExternalIDP() {
    try {
      return await Auth.federatedSignIn({
        provider: cognitoConfig.external_idp.identity_provider
      });
    } catch (error) {
      console.error('Admin Portal: External IDP sign in error:', error);
      throw error;
    }
  }

  // Get current authentication session
  async getCurrentSession() {
    try {
      const session = await Auth.currentSession();
      const tokens = {
        accessToken: session.getAccessToken().getJwtToken(),
        idToken: session.getIdToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
        expiresAt: session.getAccessToken().getExpiration() * 1000, // Convert to milliseconds
      };
      
      this.tokens = tokens;
      this.storeTokensForSubdomains(tokens);
      
      return tokens;
    } catch (error) {
      console.error('Admin Portal: Get current session error:', error);
      return null;
    }
  }

  // Get current user information
  async getCurrentUser() {
    try {
      const user = await Auth.currentAuthenticatedUser();
      return {
        username: user.username,
        email: user.attributes?.email,
        name: user.attributes?.name,
        picture: user.attributes?.picture,
        authMethod: this.determineAuthMethodFromUser(user),
        attributes: user.attributes,
      };
    } catch (error) {
      console.error('Admin Portal: Get current user error:', error);
      return null;
    }
  }

  // Determine auth method from user attributes
  determineAuthMethodFromUser(user) {
    // Check if user came from external IDP based on user ID format
    if (user.username?.includes('Auth0_')) {
      return authMethods.EXTERNAL_IDP;
    }
    return authMethods.NATIVE_COGNITO;
  }

  // Store tokens for cross-subdomain sharing
  storeTokensForSubdomains(tokens) {
    try {
      // Store in sessionStorage for current domain
      sessionStorage.setItem(TokenManager.STORAGE_KEY, JSON.stringify(tokens));
      
      // Store in localStorage for cross-subdomain sharing
      const tokenData = {
        tokens,
        timestamp: Date.now(),
        authMethod: this.authMethod,
        domain: 'admin-portal',
      };
      localStorage.setItem(TokenManager.TOKEN_DATA_KEY, JSON.stringify(tokenData));
    } catch (error) {
      console.error('Admin Portal: Token storage error:', error);
    }
  }

  // Retrieve tokens from storage
  getStoredTokens() {
    try {
      // First try sessionStorage
      const sessionTokens = sessionStorage.getItem(TokenManager.STORAGE_KEY);
      if (sessionTokens) {
        return JSON.parse(sessionTokens);
      }

      // Fallback to localStorage
      const localTokenData = localStorage.getItem(TokenManager.TOKEN_DATA_KEY);
      if (localTokenData) {
        const data = JSON.parse(localTokenData);
        // Check if tokens are still valid (not older than 1 hour)
        if (Date.now() - data.timestamp < 3600000) {
          return data.tokens;
        } else {
          // Clean up expired tokens
          localStorage.removeItem(TokenManager.TOKEN_DATA_KEY);
        }
      }
    } catch (error) {
      console.error('Admin Portal: Token retrieval error:', error);
    }
    return null;
  }

  // Legacy methods for backward compatibility
  static storeTokens(user) {
    let tokens;
    
    // Handle both OIDC user object and direct token object
    if (user.access_token) {
      // OIDC user object
      tokens = {
        accessToken: user.access_token,
        idToken: user.id_token,
        refreshToken: user.refresh_token,
        profile: user.profile,
        expiresAt: user.expires_at,
        tokenType: user.token_type || 'Bearer',
        timestamp: Date.now()
      };
    } else {
      // Direct token object (from URL parameters)
      tokens = {
        accessToken: user.accessToken,
        idToken: user.idToken,
        refreshToken: user.refreshToken,
        profile: user.profile,
        expiresAt: user.expiresAt,
        tokenType: user.tokenType || 'Bearer',
        timestamp: user.timestamp || Date.now()
      };
    }
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tokens));
      console.log('Admin Portal: Tokens stored successfully in localStorage');
      return true;
    } catch (error) {
      console.error('Admin Portal: Error storing tokens:', error);
      return false;
    }
  }

  static getTokens() {
    try {
      const tokens = localStorage.getItem(this.STORAGE_KEY);
      return tokens ? JSON.parse(tokens) : null;
    } catch (error) {
      console.error('Admin Portal: Error retrieving tokens:', error);
      return null;
    }
  }

  static clearTokens() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.TOKEN_DATA_KEY);
      localStorage.removeItem(this.AUTH_METHOD_KEY);
      sessionStorage.removeItem(this.STORAGE_KEY);
      console.log('Admin Portal: Tokens cleared successfully from localStorage');
      return true;
    } catch (error) {
      console.error('Admin Portal: Error clearing tokens:', error);
      return false;
    }
  }

  // Sign out
  async signOut() {
    try {
      await Auth.signOut({ global: true });
      
      // Clear stored tokens
      TokenManager.clearTokens();
      
      this.tokens = null;
      this.authMethod = null;
    } catch (error) {
      console.error('Admin Portal: Sign out error:', error);
      throw error;
    }
  }

  // Check if user is authenticated
  async isAuthenticated() {
    try {
      await Auth.currentAuthenticatedUser();
      return true;
    } catch {
      return false;
    }
  }

  static async validateToken(token) {
    try {
      if (!token) return false;

      // Decode JWT payload (base64 decode the middle part)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Check if token is expired
      const isValid = payload.exp > currentTime;
      
      if (!isValid) {
        console.log('Admin Portal: Token expired at:', new Date(payload.exp * 1000));
      }
      
      return isValid;
    } catch (error) {
      console.error('Admin Portal: Error validating token:', error);
      return false;
    }
  }

  static async areStoredTokensValid() {
    const tokens = this.getTokens();
    if (!tokens || !tokens.accessToken) {
      return false;
    }

    return await this.validateToken(tokens.accessToken);
  }

  static getUserProfile() {
    const tokens = this.getTokens();
    return tokens?.profile || null;
  }

  static getAccessToken() {
    const tokens = this.getTokens();
    return tokens?.accessToken || null;
  }

  static getAuthHeaders() {
    const tokens = this.getTokens();
    console.log('Admin Portal: TokenManager - getting auth headers');
    
    if (!tokens || !tokens.accessToken) {
      console.log('Admin Portal: No tokens available for auth headers');
      return {};
    }

    const authHeader = `${tokens.tokenType || 'Bearer'} ${tokens.accessToken}`;
    console.log('Admin Portal: Generated auth header');
    
    return {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    };
  }

  // Utility methods
  extractRegionFromAuthority(authority) {
    const match = authority.match(/cognito-idp\.([^.]+)\.amazonaws\.com/);
    return match ? match[1] : 'us-east-1';
  }

  extractUserPoolIdFromAuthority(authority) {
    const match = authority.match(/amazonaws\.com\/([^/]+)/);
    return match ? match[1] : null;
  }
}

// Export both instance and static class for backward compatibility
const tokenManagerInstance = new TokenManager();
export default TokenManager;
export { tokenManagerInstance };