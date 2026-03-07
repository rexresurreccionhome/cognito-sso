/**
 * Token Manager Utility
 * Handles cross-subdomain token storage and validation
 */
class TokenManager {
  static STORAGE_KEY = 'cognitoTokens';

  /**
   * Store tokens in session storage for cross-subdomain sharing
   * @param {Object} user - OIDC user object containing tokens
   * @returns {boolean} Success status
   */
  static storeTokens(user) {
    try {
      const tokens = {
        accessToken: user.access_token,
        idToken: user.id_token,
        refreshToken: user.refresh_token,
        profile: user.profile,
        expiresAt: user.expires_at,
        tokenType: user.token_type || 'Bearer'
      };
      
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(tokens));
      console.log('Tokens stored successfully');
      return true;
    } catch (error) {
      console.error('Error storing tokens:', error);
      return false;
    }
  }

  /**
   * Retrieve stored tokens from session storage
   * @returns {Object|null} Stored tokens or null
   */
  static getTokens() {
    try {
      const tokens = sessionStorage.getItem(this.STORAGE_KEY);
      return tokens ? JSON.parse(tokens) : null;
    } catch (error) {
      console.error('Error retrieving tokens:', error);
      return null;
    }
  }

  /**
   * Clear stored tokens from session storage
   * @returns {boolean} Success status
   */
  static clearTokens() {
    try {
      sessionStorage.removeItem(this.STORAGE_KEY);
      console.log('Tokens cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing tokens:', error);
      return false;
    }
  }

  /**
   * Validate if token is still valid (not expired)
   * @param {string} token - JWT token to validate
   * @returns {Promise<boolean>} Validation result
   */
  static async validateToken(token) {
    try {
      if (!token) return false;

      // Decode JWT payload (base64 decode the middle part)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Check if token is expired
      const isValid = payload.exp > currentTime;
      
      if (!isValid) {
        console.log('Token expired at:', new Date(payload.exp * 1000));
      }
      
      return isValid;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }

  /**
   * Check if stored tokens are valid
   * @returns {Promise<boolean>} Validation result
   */
  static async areStoredTokensValid() {
    const tokens = this.getTokens();
    if (!tokens || !tokens.accessToken) {
      return false;
    }

    return await this.validateToken(tokens.accessToken);
  }

  /**
   * Get user profile from stored tokens
   * @returns {Object|null} User profile or null
   */
  static getUserProfile() {
    const tokens = this.getTokens();
    return tokens?.profile || null;
  }

  /**
   * Get access token for API calls
   * @returns {string|null} Access token or null
   */
  static getAccessToken() {
    const tokens = this.getTokens();
    return tokens?.accessToken || null;
  }

  /**
   * Create authorization header for API calls
   * @returns {Object} Authorization header object
   */
  static getAuthHeaders() {
    const tokens = this.getTokens();
    if (!tokens?.accessToken) {
      return {};
    }

    return {
      'Authorization': `${tokens.tokenType} ${tokens.accessToken}`,
      'Content-Type': 'application/json'
    };
  }
}

export default TokenManager;