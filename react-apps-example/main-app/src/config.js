// Cognito configuration for the application
export const cognitoConfig = {
  authority: process.env.REACT_APP_COGNITO_AUTHORITY || "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX",
  client_id: process.env.REACT_APP_COGNITO_CLIENT_ID || "your-client-id-here",
  redirect_uri: window.location.origin + "/",
  response_type: "code",
  scope: "email openid profile",
  post_logout_redirect_uri: window.location.origin + "/",
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
  apiApp: process.env.REACT_APP_API_APP_URL || "https://api.domain.com",
};