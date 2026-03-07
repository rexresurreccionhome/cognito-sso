# Native Cognito SSO Implementation: Multi-Apps and Cross-Subdomain

## Overview

This guide provides a comprehensive implementation plan for Native AWS Cognito SSO across multiple applications and subdomains. This approach allows users to authenticate once and access multiple applications within your ecosystem without re-authentication.

## Architecture Overview

```
                    ┌─────────────────────────────────────────┐
                    │           AWS Cognito User Pool         │
                    │                                         │
                    │  ┌─────────────┐  ┌─────────────────┐   │
                    │  │   Users     │  │  App Clients    │   │
                    │  │ Management  │  │  Configuration  │   │
                    │  └─────────────┘  └─────────────────┘   │
                    └─────────────────────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
            ┌───────▼────────┐ ┌──────▼────────┐ ┌──────▼────────┐
            │   Main App     │ │  Admin Portal │ │  Mobile API   │
            │ app.domain.com │ │admin.domain.com│ │api.domain.com │
            └────────────────┘ └───────────────┘ └───────────────┘
```

## Token Flow Diagram

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    User     │────▶│    Main App     │────▶│  Cognito User   │
│             │     │ app.domain.com  │     │      Pool       │
└─────────────┘     └─────────────────┘     └─────────────────┘
       │                     │                       │
       │                     │                       │
       │              ┌──────▼──────┐               │
       │              │   Hosted    │               │
       │              │     UI      │               │
       │              │(Login Page) │               │
       │              └──────┬──────┘               │
       │                     │                       │
       │                     │                       │
       │              ┌──────▼──────┐         ┌─────▼─────┐
       │              │ Auth Code   │◀────────┤   JWT     │
       │              │  Response   │         │  Tokens   │
       │              └──────┬──────┘         │ (ID/Access│
       │                     │                │ /Refresh) │
       │                     │                └───────────┘
       │              ┌──────▼──────┐
       │              │   Token     │
       │              │  Exchange   │
       │              └──────┬──────┘
       │                     │
       │              ┌──────▼──────┐
       │              │   Store     │
       │              │  Tokens     │
       │              │(localStorage/│
       │              │sessionStorage│
       │              └──────┬──────┘
       │                     │
       │                     │
┌──────▼──────┐       ┌──────▼──────┐       ┌─────────────┐
│Admin Portal │       │  Mobile API │       │ Other Apps  │
│admin.domain │◀─────▶│ api.domain  │◀─────▶│*.domain.com │
│    .com     │       │    .com     │       │             │
└─────────────┘       └─────────────┘       └─────────────┘
       │                     │                     │
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Shared Token   │
                    │   Validation    │
                    │   (JWT Verify)  │
                    └─────────────────┘
```

## Implementation Plan

### Phase 1: AWS Cognito User Pool Setup

#### Step 1: Create User Pool

1. **Navigate to AWS Cognito Console**
   ```
   AWS Console → Cognito → User Pools → Create User Pool
   ```

2. **Configure Sign-in Experience**
   ```yaml
   Authentication providers:
     - Cognito User Pool
   Sign-in options:
     - Email
     - Username (optional)
   User name requirements:
     - Case sensitive: No
     - Allow users to sign in with preferred username: Yes
   ```

3. **Configure Security Requirements**
   ```yaml
   Password policy:
     - Minimum length: 8 characters
     - Require numbers: Yes
     - Require special characters: Yes
     - Require uppercase letters: Yes
     - Require lowercase letters: Yes
   
   Multi-factor authentication (MFA):
     - Optional (for POC)
     - Required (for production)
   
   User account recovery:
     - Email only (for simplicity)
   ```

4. **Configure Sign-up Experience**
   ```yaml
   Self-service sign-up:
     - Enable self-registration: Yes
   
   Attribute verification and user account confirmation:
     - Send email verification messages: Yes
     - Allow Cognito to automatically send messages: Yes
   
   Required attributes:
     - Email address
     - Name (optional)
   
   Custom attributes:
     - role (String, mutable)
     - department (String, mutable)
   ```

5. **Configure Message Delivery**
   ```yaml
   Email:
     - Send email with Cognito (for POC)
     - Use Amazon SES (for production)
   
   SMS: 
     - Use Amazon SNS (if MFA via SMS is needed)
   ```

6. **Integrate Your App**
   ```yaml
   User pool name: company-sso-user-pool
   
   App client settings:
     - App client name: main-web-app
     - Generate client secret: No (for web apps)
     - Auth flows:
       ✓ ALLOW_USER_SRP_AUTH
       ✓ ALLOW_REFRESH_TOKEN_AUTH
     
     - App client name: admin-portal
     - Generate client secret: No
     
     - App client name: mobile-api
     - Generate client secret: Yes (for server-side)
   ```

#### Step 2: Configure Hosted UI Domain

1. **Set up Default Cognito Domain**
   ```
   AWS Console → User Pool → App integration → Domain → Create Cognito domain
   Domain prefix: company-sso-poc
   Full domain: company-sso-poc.auth.us-east-1.amazoncognito.com
   ```

2. **Configure OAuth 2.0 Settings**
   ```yaml
   Allowed OAuth Flows:
     ✓ Authorization code grant
     ✓ Implicit grant (for testing only)
   
   Allowed OAuth Scopes:
     ✓ openid
     ✓ email
     ✓ profile
     ✓ phone (if needed)
   
   Callback URLs:
     - https://app.domain.com/auth/callback
     - https://admin.domain.com/auth/callback
     - https://api.domain.com/auth/callback
     - http://localhost:3000/auth/callback (for development)
   
   Sign out URLs:
     - https://domain.com/logout
     - https://app.domain.com/logout
     - https://admin.domain.com/logout
     - http://localhost:3000/logout (for development)
   ```

### Phase 2: Application Implementation

#### Step 1: Main Application Setup (app.domain.com)

1. **Install OIDC Client Libraries**
   ```bash
   npm install oidc-client-ts react-oidc-context --save
   # or
   yarn add oidc-client-ts react-oidc-context
   ```

2. **Configure OIDC Context**
   ```javascript
   // src/index.js
   import React from "react";
   import ReactDOM from "react-dom/client";
   import App from "./App";
   import { AuthProvider } from "react-oidc-context";
   
   const cognitoAuthConfig = {
     authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX",
     client_id: "63fbo7flparngflphffsampd",
     redirect_uri: "https://d041iyap4wlc.cloudfront.net/",
     response_type: "code",
     scope: "email openid phone",
   };
   
   const root = ReactDOM.createRoot(document.getElementById("root"));
   
   // Wrap the application with AuthProvider
   root.render(
     <React.StrictMode>
       <AuthProvider {...cognitoAuthConfig}>
         <App />
       </AuthProvider>
     </React.StrictMode>
   );
   ```

3. **Create Main App Component**

   ```javascript
   // src/App.js
   import { useAuth } from "react-oidc-context";
   
   function App() {
     const auth = useAuth();
   
     const signOutRedirect = () => {
       const clientId = "63fbo7flparngflphffsampd";
       const logoutUri = "logout_uri";
       const cognitoDomain = "https://us-east-1qoh84m4a6.auth.us-east-1.amazoncognito.com";
       window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
     };
   
     if (auth.isLoading) {
       return <div>Loading...</div>;
     }
   
     if (auth.error) {
       return <div>Encountering error... {auth.error.message}</div>;
     }
   
     if (auth.isAuthenticated) {
       return (
         <div>
           <div>Hello: {auth.user?.profile.email}</div>
           <div>ID Token: {auth.user?.id_token}</div>
           <div>Access Token: {auth.user?.access_token}</div>
           <div>Refresh Token: {auth.user?.refresh_token}</div>
           <button onClick={() => auth.removeUser()}>Sign out</button>
         </div>
       );
     }
   
     return (
       <div>
         <button onClick={() => auth.signinRedirect()}>Sign in</button>
         <button onClick={() => signOutRedirect()}>Sign out</button>
       </div>
     );
   }
   
   export default App;
   ```

4. **Handle Authentication States**

#### Step 2: Cross-Subdomain Token Sharing

1. **Token Storage Utility**
   ```javascript
   // src/utils/tokenManager.js
   class TokenManager {
     static STORAGE_KEY = 'oidcTokens';
   
     static storeTokens(user) {
       try {
         const tokens = {
           accessToken: user.access_token,
           idToken: user.id_token,
           refreshToken: user.refresh_token,
           profile: user.profile
         };
         sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(tokens));
         return true;
       } catch (error) {
         console.error('Error storing tokens:', error);
         return false;
       }
     }
   
     static getTokens() {
       try {
         const tokens = sessionStorage.getItem(this.STORAGE_KEY);
         return tokens ? JSON.parse(tokens) : null;
       } catch (error) {
         console.error('Error retrieving tokens:', error);
         return null;
       }
     }
   
     static clearTokens() {
       try {
         sessionStorage.removeItem(this.STORAGE_KEY);
         return true;
       } catch (error) {
         console.error('Error clearing tokens:', error);
         return false;
       }
     }
   
     static async validateToken(token) {
       try {
         // Decode JWT token (you might want to use a library like jwt-decode)
         const payload = JSON.parse(atob(token.split('.')[1]));
         const currentTime = Math.floor(Date.now() / 1000);
         
         return payload.exp > currentTime;
       } catch (error) {
         console.error('Error validating token:', error);
         return false;
       }
     }
   }
   
   export default TokenManager;
   ```

2. **Cross-Subdomain Authentication Hook**
   ```javascript
   // src/hooks/useSubdomainAuth.js
   import { useState, useEffect } from 'react';
   import { useAuth } from 'react-oidc-context';
   import TokenManager from '../utils/tokenManager';
   
   const useSubdomainAuth = () => {
     const auth = useAuth();
     const [isAuthenticated, setIsAuthenticated] = useState(false);
     const [user, setUser] = useState(null);
     const [loading, setLoading] = useState(true);
   
     useEffect(() => {
       checkAuthentication();
     }, [auth.isAuthenticated, auth.user]);
   
     const checkAuthentication = async () => {
       try {
         if (auth.isAuthenticated && auth.user) {
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
         setIsAuthenticated(false);
       } finally {
         setLoading(false);
       }
     };
   
     const checkStoredTokens = async () => {
       const storedTokens = TokenManager.getTokens();
       
       if (storedTokens && storedTokens.accessToken) {
         const isValid = await TokenManager.validateToken(storedTokens.accessToken);
         
         if (isValid) {
           setUser(storedTokens);
           setIsAuthenticated(true);
         } else {
           // Token expired, clear storage
           TokenManager.clearTokens();
           setIsAuthenticated(false);
         }
       } else {
         setIsAuthenticated(false);
       }
     };
   
     const redirectToAuth = () => {
       // Redirect to main app for authentication
       window.location.href = `https://app.domain.com/?redirect=${encodeURIComponent(window.location.href)}`;
     };
   
     const logout = async () => {
       try {
         if (auth.removeUser) {
           await auth.removeUser();
         }
         TokenManager.clearTokens();
         setUser(null);
         setIsAuthenticated(false);
       } catch (error) {
         console.error('Logout error:', error);
       }
     };
   
     return {
       isAuthenticated,
       user,
       loading,
       logout,
       redirectToAuth
     };
   };
   
   export default useSubdomainAuth;
   ```

#### Step 3: Admin Portal Implementation (admin.domain.com)

1. **Admin Portal App Configuration**
   ```javascript
   // admin-portal/src/index.js
   import React from "react";
   import ReactDOM from "react-dom/client";
   import AdminApp from "./AdminApp";
   import { AuthProvider } from "react-oidc-context";
   
   const cognitoAuthConfig = {
     authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX",
     client_id: "admin-portal-client-id",
     redirect_uri: "https://admin.domain.com/",
     response_type: "code",
     scope: "email openid phone",
   };
   
   const root = ReactDOM.createRoot(document.getElementById("root"));
   
   root.render(
     <React.StrictMode>
       <AuthProvider {...cognitoAuthConfig}>
         <AdminApp />
       </AuthProvider>
     </React.StrictMode>
   );
   ```

2. **Admin Portal Authentication Component**
   ```javascript
   // admin-portal/src/components/AdminAuth.js
   import React from 'react';
   import useSubdomainAuth from '../hooks/useSubdomainAuth';
   
   const AdminAuth = ({ children }) => {
     const { isAuthenticated, user, loading, logout } = useSubdomainAuth();
   
     if (loading) {
       return <div>Loading admin portal...</div>;
     }
   
     if (!isAuthenticated) {
       return (
         <div>
           <h1>Admin Access Required</h1>
           <p>Please sign in to access the admin portal.</p>
           <button onClick={() => window.location.href = 'https://app.domain.com/auth/login?redirect=' + encodeURIComponent(window.location.href)}>
             Sign In
           </button>
         </div>
       );
     }
   
     // Check if user has admin role
     const isAdmin = user?.attributes?.['custom:role'] === 'admin';
     
     if (!isAdmin) {
       return (
         <div>
           <h1>Access Denied</h1>
           <p>You don't have admin privileges.</p>
           <button onClick={logout}>Sign Out</button>
         </div>
       );
     }
   
     return (
       <div>
         <nav>
           <span>Admin: {user.attributes.email}</span>
           <button onClick={logout}>Sign Out</button>
         </nav>
         {children}
       </div>
     );
   };
   
   export default AdminAuth;
   ```

#### Step 4: API Implementation (api.domain.com)

1. **API Token Validation Middleware**
   ```javascript
   // api/middleware/authMiddleware.js
   const jwt = require('jsonwebtoken');
   const jwksClient = require('jwks-rsa');
   
   const client = jwksClient({
     jwksUri: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX/.well-known/jwks.json'
   });
   
   const getKey = (header, callback) => {
     client.getSigningKey(header.kid, (err, key) => {
       const signingKey = key.publicKey || key.rsaPublicKey;
       callback(null, signingKey);
     });
   };
   
   const authMiddleware = (req, res, next) => {
     const token = req.headers.authorization?.replace('Bearer ', '');
     
     if (!token) {
       return res.status(401).json({ error: 'No token provided' });
     }
   
     jwt.verify(token, getKey, {
       audience: 'your-app-client-id',
       issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX',
       algorithms: ['RS256']
     }, (err, decoded) => {
       if (err) {
         return res.status(401).json({ error: 'Invalid token' });
       }
       
       req.user = decoded;
       next();
     });
   };
   
   module.exports = authMiddleware;
   ```

2. **API Routes with Authentication**
   ```javascript
   // api/routes/protected.js
   const express = require('express');
   const router = express.Router();
   const authMiddleware = require('../middleware/authMiddleware');
   
   // Apply auth middleware to all routes
   router.use(authMiddleware);
   
   router.get('/profile', (req, res) => {
     res.json({
       user: {
         id: req.user.sub,
         email: req.user.email,
         name: req.user.name,
         role: req.user['custom:role']
       }
     });
   });
   
   router.get('/admin-data', (req, res) => {
     // Check if user has admin role
     if (req.user['custom:role'] !== 'admin') {
       return res.status(403).json({ error: 'Admin access required' });
     }
   
     res.json({
       message: 'Admin data accessed successfully',
       data: { /* admin specific data */ }
     });
   });
   
   module.exports = router;
   ```

### Phase 3: Advanced Configuration

#### CORS Configuration
```javascript
// Enable CORS for cross-subdomain requests
const corsOptions = {
  origin: [
    'https://app.domain.com',
    'https://admin.domain.com',
    'https://domain.com',
    // Add development origins
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

#### Security Best Practices
```javascript
// 1. Token refresh logic
const refreshTokenIfNeeded = async (accessToken) => {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Refresh if token expires in less than 5 minutes
    if (payload.exp - currentTime < 300) {
      await TokenManager.refreshTokens();
    }
  } catch (error) {
    console.error('Error checking token expiration:', error);
  }
};

// 2. Secure API calls
const makeSecureAPICall = async (url, options = {}) => {
  const tokens = TokenManager.getTokens();
  
  if (!tokens || !tokens.accessToken) {
    throw new Error('No access token available');
  }
  
  await refreshTokenIfNeeded(tokens.accessToken);
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${tokens.accessToken}`,
      'Content-Type': 'application/json'
    }
  });
};
```

## Testing Scenarios

### 1. Single Sign-On Flow
1. User visits `app.domain.com`
2. Redirected to Cognito Hosted UI
3. After authentication, returned to `app.domain.com`
4. User navigates to `admin.domain.com`
5. Should be automatically authenticated

### 2. Token Validation
1. Make API calls to `api.domain.com`
2. Verify tokens are properly validated
3. Test token refresh scenarios

### 3. Sign-Out Propagation
1. Sign out from one subdomain
2. Verify user is signed out from all subdomains

## Phase 4: Hosting and Deployment

### Recommended Hosting: AWS Amplify Hosting

**Why Amplify Hosting for POC?**
- ✅ **Easiest Setup**: Designed specifically for React apps
- ✅ **Free Tier**: Generous limits for POC (1000 build minutes, 15GB served per month)
- ✅ **Automatic Deployments**: Connect to GitHub and auto-deploy on push
- ✅ **Built-in CI/CD**: Handles build process automatically
- ✅ **HTTPS by Default**: SSL certificates managed automatically
- ✅ **Global CDN**: Fast loading worldwide
- ✅ **Custom Domain Support**: Easy to add later
- ✅ **Environment Variables**: Easy configuration management

### Step-by-Step Amplify Hosting Setup

1. **Prepare Your React App**
   ```bash
   # Create React app structure
   npx create-react-app cognito-sso-main-app
   cd cognito-sso-main-app
   
   # Install dependencies
   npm install oidc-client-ts react-oidc-context
   
   # Add your authentication code
   # (Use the code examples from above)
   ```

2. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Cognito SSO POC"
   git branch -M main
   git remote add origin https://github.com/yourusername/cognito-sso-poc.git
   git push -u origin main
   ```

3. **Set Up Amplify Hosting**
   ```
   AWS Console → Amplify → Host web app
   → GitHub → Authorize AWS Amplify
   → Select Repository: cognito-sso-poc
   → Select Branch: main
   → Configure build settings (usually auto-detected)
   → Review and Deploy
   ```

4. **Build Configuration (usually auto-generated)**
   ```yaml
   # amplify.yml (created automatically)
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: build
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

5. **Environment Variables in Amplify**
   ```
   Amplify Console → App Settings → Environment Variables
   Add:
   - REACT_APP_COGNITO_USER_POOL_ID: us-east-1_XXXXXXXXX
   - REACT_APP_COGNITO_CLIENT_ID: your-client-id
   - REACT_APP_COGNITO_DOMAIN: company-sso-poc.auth.us-east-1.amazoncognito.com
   ```

6. **Update React App to Use Environment Variables**
   ```javascript
   // src/config.js
   export const cognitoAuthConfig = {
     authority: `https://cognito-idp.us-east-1.amazonaws.com/${process.env.REACT_APP_COGNITO_USER_POOL_ID}`,
     client_id: process.env.REACT_APP_COGNITO_CLIENT_ID,
     redirect_uri: window.location.origin + "/",
     response_type: "code",
     scope: "email openid phone",
   };
   ```

### Alternative: S3 Static Hosting (More Manual)

If you prefer more control, you can use S3 + CloudFront:

1. **Build React App**
   ```bash
   npm run build
   ```

2. **Create S3 Bucket**
   ```
   AWS Console → S3 → Create Bucket
   - Bucket name: cognito-sso-poc-main-app
   - Region: us-east-1
   - Public access: Allow (for static website)
   ```

3. **Enable Static Website Hosting**
   ```
   S3 Bucket → Properties → Static website hosting
   - Enable
   - Index document: index.html
   - Error document: index.html (for SPA routing)
   ```

4. **Upload Build Files**
   ```bash
   aws s3 sync build/ s3://cognito-sso-poc-main-app --delete
   ```

5. **Set Up CloudFront (Optional but Recommended)**
   ```
   AWS Console → CloudFront → Create Distribution
   - Origin domain: your-s3-bucket-website-endpoint
   - Viewer protocol policy: Redirect HTTP to HTTPS
   ```

### Cost Comparison (Free Tier)

| Service | Amplify Hosting | S3 + CloudFront |
|---------|----------------|-----------------|
| **Setup Complexity** | Very Easy | Moderate |
| **Build Automation** | Included | Manual |
| **SSL Certificate** | Automatic | Manual setup |
| **CDN** | Included | Optional |
| **Monthly Cost (POC)** | $0 | $0-5 |
| **Custom Domain** | Easy | Manual |
| **CI/CD** | Built-in | Manual setup |

### Recommendation: Start with Amplify Hosting

For your POC, **Amplify Hosting is definitely the way to go** because:

1. **Zero Configuration**: Works out of the box for React
2. **Free for POC Scale**: 1000 build minutes, 15GB data transfer
3. **Automatic Updates**: Push to GitHub = automatic deployment
4. **Professional URLs**: Gets you a `.amplifyapp.com` domain immediately
5. **Easy Scaling**: Can handle production traffic if POC becomes real app

### Setting Up Multiple Subdomains

Once your main app is working, you can:

1. **Create separate Amplify apps** for admin portal and API
2. **Use custom domains** to get proper subdomains later:
   - Main: `app.yourdomain.com`
   - Admin: `admin.yourdomain.com`
   - API: `api.yourdomain.com`

3. **Share environment variables** across all Amplify apps for consistency

This approach gives you professional-looking URLs, automatic deployments, and scales perfectly from POC to production!

## Step-by-Step Sample App Creation and Amplify Deployment

### Prerequisites
- Node.js 16+ installed
- AWS Account with access to Cognito and Amplify
- GitHub account
- Git installed on your machine

### Step 1: Create React Application

1. **Create new React app**
   ```bash
   npx create-react-app cognito-sso-poc
   cd cognito-sso-poc
   ```

2. **Install required dependencies**
   ```bash
   npm install oidc-client-ts react-oidc-context
   ```

3. **Clean up default files (optional)**
   ```bash
   # Remove unnecessary files
   rm src/App.css src/App.test.js src/logo.svg src/reportWebVitals.js src/setupTests.js
   ```

### Step 2: Configure AWS Cognito User Pool

Before coding, set up your Cognito User Pool:

1. **Create User Pool**
   ```
   AWS Console → Cognito → User Pools → Create user pool
   
   Step 1 - Authentication providers:
   ✓ Cognito user pool
   Sign-in options: ✓ Email
   
   Step 2 - Security requirements:
   Password policy: Use default
   Multi-factor authentication: No MFA (for POC)
   
   Step 3 - Sign-up experience:
   ✓ Enable self-service sign-up
   Required attributes: email, name
   
   Step 4 - Message delivery:
   Email provider: Send email with Cognito (for POC)
   
   Step 5 - Integrate your app:
   User pool name: cognito-sso-poc-pool
   Initial app client: poc-web-client
   Client type: Public client
   ✗ Generate a client secret (uncheck this)
   
   Step 6 - Review and create
   ```

2. **Configure App Client Settings**
   ```
   After creation → App integration tab → App client: poc-web-client
   
   Edit hosted UI settings:
   Allowed callback URLs: http://localhost:3000/
   Allowed sign-out URLs: http://localhost:3000/
   Identity providers: ✓ Cognito user pool
   OAuth 2.0 grant types: ✓ Authorization code grant
   OpenID Connect scopes: ✓ openid ✓ email ✓ profile
   ```

3. **Create Cognito Domain**
   ```
   App integration → Domain → Actions → Create Cognito domain
   Domain prefix: cognito-sso-poc-[your-unique-suffix]
   Example: cognito-sso-poc-demo123
   ```

4. **Note down important values:**
   ```
   User Pool ID: us-east-1_XXXXXXXXX
   App Client ID: abcd1234567890
   Cognito Domain: cognito-sso-poc-demo123.auth.us-east-1.amazoncognito.com
   Region: us-east-1
   ```

### Step 3: Implement Authentication Code

1. **Create configuration file**
   ```javascript
   // src/config.js
   export const cognitoConfig = {
     authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX", // Replace with your User Pool ID
     client_id: "abcd1234567890", // Replace with your App Client ID  
     redirect_uri: window.location.origin + "/",
     response_type: "code",
     scope: "email openid profile",
   };
   
   export const cognitoDomain = "https://cognito-sso-poc-demo123.auth.us-east-1.amazoncognito.com"; // Replace with your domain
   ```

2. **Update src/index.js**
   ```javascript
   // src/index.js
   import React from 'react';
   import ReactDOM from 'react-dom/client';
   import './index.css';
   import App from './App';
   import { AuthProvider } from 'react-oidc-context';
   import { cognitoConfig } from './config';
   
   const root = ReactDOM.createRoot(document.getElementById('root'));
   root.render(
     <React.StrictMode>
       <AuthProvider {...cognitoConfig}>
         <App />
       </AuthProvider>
     </React.StrictMode>
   );
   ```

3. **Create main App component**
   ```javascript
   // src/App.js
   import React from 'react';
   import { useAuth } from 'react-oidc-context';
   import { cognitoDomain, cognitoConfig } from './config';
   import './App.css';
   
   function App() {
     const auth = useAuth();
   
     const handleSignOut = () => {
       const logoutUrl = `${cognitoDomain}/logout?client_id=${cognitoConfig.client_id}&logout_uri=${encodeURIComponent(window.location.origin)}`;
       window.location.href = logoutUrl;
     };
   
     // Loading state
     if (auth.isLoading) {
       return (
         <div className="app">
           <div className="loading">
             <h2>Loading...</h2>
             <p>Checking authentication status...</p>
           </div>
         </div>
       );
     }
   
     // Error state
     if (auth.error) {
       return (
         <div className="app">
           <div className="error">
             <h2>Authentication Error</h2>
             <p>{auth.error.message}</p>
             <button onClick={() => window.location.reload()}>
               Retry
             </button>
           </div>
         </div>
       );
     }
   
     // Authenticated state
     if (auth.isAuthenticated) {
       return (
         <div className="app">
           <header className="app-header">
             <h1>🎉 Cognito SSO POC</h1>
             <p>Successfully authenticated!</p>
           </header>
           
           <main className="app-main">
             <div className="user-info">
               <h2>Welcome, {auth.user?.profile?.name || auth.user?.profile?.email}!</h2>
               
               <div className="token-info">
                 <h3>User Information:</h3>
                 <ul>
                   <li><strong>Email:</strong> {auth.user?.profile?.email}</li>
                   <li><strong>Name:</strong> {auth.user?.profile?.name}</li>
                   <li><strong>Subject:</strong> {auth.user?.profile?.sub}</li>
                   <li><strong>Email Verified:</strong> {auth.user?.profile?.email_verified ? '✅' : '❌'}</li>
                 </ul>
               </div>
   
               <div className="token-display">
                 <h3>Tokens (for debugging):</h3>
                 <div className="token-section">
                   <h4>ID Token:</h4>
                   <textarea readOnly value={auth.user?.id_token} rows="3" />
                 </div>
                 <div className="token-section">
                   <h4>Access Token:</h4>
                   <textarea readOnly value={auth.user?.access_token} rows="3" />
                 </div>
               </div>
   
               <div className="actions">
                 <button onClick={handleSignOut} className="sign-out-btn">
                   Sign Out
                 </button>
               </div>
             </div>
           </main>
         </div>
       );
     }
   
     // Not authenticated state
     return (
       <div className="app">
         <header className="app-header">
           <h1>Cognito SSO POC</h1>
           <p>Please sign in to continue</p>
         </header>
         
         <main className="app-main">
           <div className="auth-actions">
             <button 
               onClick={() => auth.signinRedirect()} 
               className="sign-in-btn"
             >
               Sign In with Cognito
             </button>
             
             <p className="auth-note">
               You'll be redirected to AWS Cognito for authentication
             </p>
           </div>
         </main>
       </div>
     );
   }
   
   export default App;
   ```

4. **Add basic styling**
   ```css
   /* src/App.css */
   .app {
     text-align: center;
     max-width: 800px;
     margin: 0 auto;
     padding: 20px;
     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
       'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
       sans-serif;
   }
   
   .app-header {
     margin-bottom: 40px;
   }
   
   .app-header h1 {
     color: #282c34;
     margin-bottom: 10px;
   }
   
   .loading, .error {
     padding: 40px;
     border: 1px solid #ddd;
     border-radius: 8px;
     background-color: #f9f9f9;
   }
   
   .error {
     border-color: #ff6b6b;
     background-color: #ffe0e0;
   }
   
   .user-info {
     background-color: #f0f8ff;
     padding: 30px;
     border-radius: 10px;
     border: 1px solid #b3d9ff;
   }
   
   .token-info ul {
     list-style: none;
     padding: 0;
     text-align: left;
   }
   
   .token-info li {
     margin: 10px 0;
     padding: 5px;
     background-color: white;
     border-radius: 4px;
   }
   
   .token-display {
     margin: 20px 0;
   }
   
   .token-section {
     margin: 15px 0;
   }
   
   .token-section h4 {
     margin-bottom: 5px;
     text-align: left;
   }
   
   .token-section textarea {
     width: 100%;
     font-family: monospace;
     font-size: 12px;
     padding: 10px;
     border: 1px solid #ccc;
     border-radius: 4px;
     resize: vertical;
   }
   
   .sign-in-btn, .sign-out-btn {
     background-color: #007bff;
     color: white;
     border: none;
     padding: 12px 24px;
     font-size: 16px;
     border-radius: 6px;
     cursor: pointer;
     margin: 10px;
   }
   
   .sign-in-btn:hover, .sign-out-btn:hover {
     background-color: #0056b3;
   }
   
   .sign-out-btn {
     background-color: #dc3545;
   }
   
   .sign-out-btn:hover {
     background-color: #c82333;
   }
   
   .auth-note {
     color: #666;
     font-size: 14px;
     margin-top: 20px;
   }
   ```

### Step 4: Test Locally

1. **Start development server**
   ```bash
   npm start
   ```

2. **Test authentication flow**
   - Open http://localhost:3000
   - Click "Sign In with Cognito"  
   - You should be redirected to Cognito Hosted UI
   - Create a new account or sign in
   - Should redirect back to your app showing user info

3. **Test sign-out**
   - Click "Sign Out" 
   - Should redirect to Cognito logout and back to app

### Step 5: Prepare for Deployment

1. **Create GitHub repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Cognito SSO POC"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/cognito-sso-poc.git
   git push -u origin main
   ```

2. **Add environment variables support (for production)**
   ```javascript
   // Update src/config.js
   export const cognitoConfig = {
     authority: process.env.REACT_APP_COGNITO_AUTHORITY || "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX",
     client_id: process.env.REACT_APP_COGNITO_CLIENT_ID || "abcd1234567890",
     redirect_uri: window.location.origin + "/",
     response_type: "code",
     scope: "email openid profile",
   };
   
   export const cognitoDomain = process.env.REACT_APP_COGNITO_DOMAIN || "https://cognito-sso-poc-demo123.auth.us-east-1.amazoncognito.com";
   ```

### Step 6: Deploy to AWS Amplify

1. **Open AWS Amplify Console**
   ```
   AWS Console → Amplify → Host web app
   ```

2. **Connect repository**
   ```
   Select source code provider: GitHub
   → Connect branch
   → Install & Authorize AWS Amplify (if first time)
   → Select repository: cognito-sso-poc
   → Select branch: main
   → Next
   ```

3. **Configure build settings**
   ```yaml
   # Amplify will auto-detect, but verify it looks like this:
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: build
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

4. **Add environment variables**
   ```
   App settings → Environment variables → Manage variables
   
   Add:
   - REACT_APP_COGNITO_AUTHORITY = https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX
   - REACT_APP_COGNITO_CLIENT_ID = abcd1234567890
   - REACT_APP_COGNITO_DOMAIN = https://cognito-sso-poc-demo123.auth.us-east-1.amazoncognito.com
   ```

5. **Save and deploy**
   ```
   Review → Save and deploy
   ```

6. **Wait for deployment** (usually 2-3 minutes)
   - Build phase: Installing dependencies and building
   - Deploy phase: Uploading to CDN
   - You'll get a URL like: https://main.d1234567890.amplifyapp.com

### Step 7: Update Cognito for Production URL

1. **Update callback URLs in Cognito**
   ```
   AWS Console → Cognito → User pools → cognito-sso-poc-pool
   → App integration → poc-web-client → Edit hosted UI settings
   
   Allowed callback URLs:
   - http://localhost:3000/ (keep for local dev)
   - https://main.d1234567890.amplifyapp.com/ (add your Amplify URL)
   
   Allowed sign-out URLs:
   - http://localhost:3000/ (keep for local dev)  
   - https://main.d1234567890.amplifyapp.com/ (add your Amplify URL)
   ```

### Step 8: Test Production App

1. **Visit your Amplify URL**
   - Open the Amplify app URL in browser
   - Click "Sign In with Cognito"
   - Should redirect to Cognito Hosted UI
   - Sign in should work and redirect back to your app

2. **Test from different devices/browsers**
   - Verify authentication works across different browsers
   - Test sign-up flow with new account
   - Test sign-out functionality

### Step 9: Monitor and Debug

1. **Check Amplify logs**
   ```
   Amplify Console → Your app → Build history
   → Click on build number to see detailed logs
   ```

2. **Enable CloudWatch logs (optional)**
   ```
   Amplify Console → Monitoring → Enable logging
   ```

3. **Common issues and solutions:**

   **Issue: Redirect mismatch error**
   ```
   Solution: Ensure callback URLs in Cognito exactly match your app URLs
   ```

   **Issue: CORS errors**
   ```
   Solution: Cognito handles CORS for authentication, but check if you're making additional API calls
   ```

   **Issue: Token not found**
   ```
   Solution: Check if environment variables are correctly set in Amplify
   ```

### Step 10: Create Additional Apps (Optional)

For testing cross-subdomain SSO, create an admin portal:

1. **Create second React app**
   ```bash
   npx create-react-app cognito-sso-admin
   cd cognito-sso-admin
   npm install oidc-client-ts react-oidc-context
   ```

2. **Use the same Cognito configuration**
   - Same User Pool ID and Client ID
   - Create second app client in Cognito if needed

3. **Deploy to separate Amplify app**
   - Follow same deployment steps
   - You'll get second URL for admin portal

4. **Test SSO between apps**
   - Sign in to main app
   - Open admin app in new tab
   - Should automatically authenticate (or with one click)

This complete workflow takes you from zero to a working Cognito SSO application deployed on AWS Amplify!

## Production Considerations

### 1. Custom Domain Setup (Optional)
```bash
# For production, consider setting up custom domain for branding:
# Example: auth.yourdomain.com instead of company-sso-poc.auth.us-east-1.amazoncognito.com
# Benefits: Better branding, user trust, enterprise requirements
# Current POC setup works fine for testing and development
```

### 2. Security Headers
```javascript
// Add security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

### 3. Monitoring and Logging
```javascript
// Log authentication events
const logAuthEvent = (event, user, metadata = {}) => {
  console.log({
    timestamp: new Date().toISOString(),
    event,
    userId: user?.sub,
    email: user?.email,
    ...metadata
  });
};
```

### 4. Error Handling
```javascript
// Global error handler for authentication errors
const handleAuthError = (error) => {
  if (error.code === 'NotAuthorizedException') {
    // Redirect to login
    window.location.href = '/login';
  } else if (error.code === 'TokenRefreshError') {
    // Clear tokens and redirect
    TokenManager.clearTokens();
    window.location.href = '/login';
  }
};
```

## Deployment Checklist

- [ ] AWS Cognito User Pool configured
- [ ] Default Cognito domain created (company-sso-poc.auth.region.amazoncognito.com)
- [ ] App clients created for each subdomain
- [ ] Hosted UI configured with proper callback URLs
- [ ] CORS settings configured
- [ ] SSL certificates installed for all subdomains
- [ ] Token validation implemented
- [ ] Cross-subdomain token sharing working
- [ ] Sign-out propagation working
- [ ] Error handling implemented
- [ ] Security headers configured
- [ ] Monitoring and logging setup
- [ ] Custom domain setup (optional for production)

## Troubleshooting Common Issues

### Issue 1: Tokens not shared across subdomains
- Check if sessionStorage is accessible across subdomains
- Verify CORS configuration
- Check browser security settings

### Issue 2: Token validation failing
- Verify JWKS endpoint URL
- Check token audience and issuer
- Confirm app client configuration

### Issue 3: Redirect loops
- Check callback URL configuration
- Verify auth state management
- Review redirect logic in applications

This implementation provides a robust foundation for Native Cognito SSO across multiple applications and subdomains. Start with the basic setup and gradually add advanced features as needed.