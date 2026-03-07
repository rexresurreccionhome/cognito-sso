/**
 * Token Manager Utility - Admin Portal Version
 * Handles cross-subdomain token storage and validation
 * This is a shared utility across all applications
 */
class TokenManager {
  static STORAGE_KEY = 'cognitoTokens';

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
      console.log('Admin Portal: Tokens stored successfully');
      return true;
    } catch (error) {
      console.error('Admin Portal: Error storing tokens:', error);
      return false;
    }
  }

  static getTokens() {
    try {
      const tokens = sessionStorage.getItem(this.STORAGE_KEY);
      return tokens ? JSON.parse(tokens) : null;
    } catch (error) {
      console.error('Admin Portal: Error retrieving tokens:', error);
      return null;
    }
  }

  static clearTokens() {
    try {
      sessionStorage.removeItem(this.STORAGE_KEY);
      console.log('Admin Portal: Tokens cleared successfully');
      return true;
    } catch (error) {
      console.error('Admin Portal: Error clearing tokens:', error);
      return false;
    }
  }

  static async validateToken(token) {
    try {
      if (!token) return false;

      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
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
    if (!tokens?.accessToken) {
      return {};
    }

    return {
      'Authorization': `${tokens.tokenType} ${tokens.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Check if user has admin role
   */
  static hasAdminRole() {
    const profile = this.getUserProfile();
    if (!profile) return false;

    const userRole = profile['custom:role'] || profile.role;
    return ['admin', 'super-admin', 'administrator'].includes(userRole?.toLowerCase());
  }

  /**
   * Get user role
   */
  static getUserRole() {
    const profile = this.getUserProfile();
    return profile?.['custom:role'] || profile?.role || 'user';
  }
}

export default TokenManager;