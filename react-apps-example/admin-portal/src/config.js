// Enhanced Admin Portal Configuration
export const cognitoConfig = {
  authority: process.env.REACT_APP_COGNITO_AUTHORITY || "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX",
  client_id: process.env.REACT_APP_COGNITO_CLIENT_ID || "your-admin-client-id-here",
  redirect_uri: window.location.origin + "/",
  response_type: "code",
  scope: "email openid profile",
  post_logout_redirect_uri: window.location.origin + "/",
  
  // External IDP Configuration
  external_idp: {
    enabled: process.env.REACT_APP_USE_EXTERNAL_IDP === 'true',
    provider: 'Auth0',
    identity_provider: 'Auth0', // Must match Cognito IDP name
  }
};

export const featureFlags = {
  USE_EXTERNAL_IDP: process.env.REACT_APP_USE_EXTERNAL_IDP === 'true',
  ENABLE_MFA: process.env.REACT_APP_ENABLE_MFA === 'true',
  ENABLE_SOCIAL_LOGIN: process.env.REACT_APP_ENABLE_SOCIAL_LOGIN === 'true',
};

export const cognitoDomain = process.env.REACT_APP_COGNITO_DOMAIN || "https://your-domain.auth.us-east-1.amazoncognito.com";

// API endpoints
export const apiConfig = {
  baseUrl: process.env.REACT_APP_API_BASE_URL || "https://api.domain.com",
};

// Application configuration
export const appConfig = {
  mainApp: process.env.REACT_APP_MAIN_APP_URL || "https://app.domain.com",
  adminApp: process.env.REACT_APP_ADMIN_APP_URL || "https://admin.domain.com",
  apiApp: process.env.REACT_APP_API_BASE_URL || "https://api.domain.com",
};

// Authentication method selection
export const authMethods = {
  NATIVE_COGNITO: 'native-cognito',
  EXTERNAL_IDP: 'external-idp',
};

// Admin-specific configuration
export const adminConfig = {
  requiredRoles: ['admin', 'super-admin'],
  features: {
    userManagement: true,
    systemSettings: true,
    analytics: true,
    logs: true,
  },
};