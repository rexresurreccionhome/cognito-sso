# Main App - Cognito SSO POC 🏠

## 🎯 Purpose in the POC

This is the **primary entry point** for the entire POC ecosystem. It demonstrates:

**Business Scenario**: **Employee Self-Service Portal**
- Where employees first land when accessing company applications
- Handles initial authentication and serves as the "home base"
- Provides navigation to specialized applications (Admin Portal)
- Shows personalized information after successful login

## 🔄 Role in the SSO Ecosystem

```
USER JOURNEY STARTS HERE:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User visits   │───▶│  Main App       │───▶│ Cognito Login   │
│   company.com   │    │ (This app)      │    │ (Hosted UI)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        │
                       ┌─────────────────┐             │
                       │ Store JWT tokens│◄────────────┘
                       │ in localStorage │
                       └─────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ CROSS-DOMAIN SSO    │
                    │ URL redirect with:  │
                    │ • ?access_token=... │◄─── Direct token passing
                    │ • ?id_token=...     │     via URL parameters!
                    │ • ?profile=...      │     (localStorage is domain-isolated)
                    └─────────────────────┘
```

### ✅ **Authentication Hub**
- **OAuth 2.0 + OpenID Connect** integration with AWS Cognito
- **Hosted UI** for secure, standards-compliant login
- **Token Management** - Stores JWT tokens for the entire ecosystem
- **Session Persistence** - Remembers authentication across browser sessions

### ✅ **User Experience**
- **Personalized Dashboard** showing user profile and permissions
- **Navigation Hub** to other applications in the ecosystem
- **API Integration Demo** - Shows how to make authenticated API calls
- **Token Debugging** - Displays JWT tokens for developer understanding

### ✅ **Cross-Domain Integration**
- **URL Parameter Token Passing** - Tokens passed via redirect URLs to other domains
- **localStorage Storage** - Within-domain token persistence (domain-isolated)
- **Automatic Token Detection** - Apps parse tokens from incoming URL parameters
- **URL History Cleanup** - Remove sensitive tokens from browser address bar
- **Role-Based Access Control** - Admin portal validates user permissions

## 🔗 Connections to Other POC Components

### **→ Admin Portal Integration**
```javascript
// When user clicks "Admin Portal" button:
1. Main App constructs URL with tokens:
   const params = new URLSearchParams();
   params.set('access_token', userTokens.access_token);
   params.set('id_token', userTokens.id_token);
   params.set('profile', JSON.stringify(userTokens.profile));
   const adminUrl = `${adminBaseUrl}?${params.toString()}`;

2. Browser redirects to Admin Portal with tokens in URL
3. Admin Portal reads tokens from URL parameters
4. Admin Portal stores tokens in ITS OWN localStorage
5. URL parameters cleaned from address bar for security
6. Role validation determines access level
```

### **→ API Backend Integration**
```javascript
// API calls from Main App:
• GET /api/protected/profile - Get current user info
• GET /api/protected/test - Test authentication
• API automatically validates JWT token from Cognito
• Role-based responses based on user permissions
```

### **→ Business Value Demonstration**
| Feature | Business Impact |
|---------|----------------|
| **Single Sign-On** | Employees access multiple systems with one login |
| **Role-Based UI** | Different users see different capabilities |
| **Token Security** | Enterprise-grade JWT validation |
| **Seamless Navigation** | No friction between company applications |

## 🧪 POC Testing Scenarios

### **Scenario 1: New Employee Onboarding**
```
1. New employee gets company portal link (this app)
2. Clicks "Sign In" → Redirected to secure Cognito form
3. Creates account with company email
4. Email verification (production-ready security)
5. Lands on personalized dashboard
6. Can navigate to other company apps seamlessly
```

### **Scenario 2: Cross-Domain Navigation**
```
1. User authenticated in Main App (main.d3nnzt3f1swzid.amplifyapp.com)
2. Clicks "Admin Portal" link → Redirects to different domain
3. URL redirect: admin.domain.com?access_token=...&id_token=...
4. Admin Portal (different domain) receives tokens via URL
5. Admin Portal stores tokens in ITS localStorage
6. URL cleaned: admin.domain.com (tokens removed from address bar)
7. No re-login required - seamless cross-domain SSO!

Note: localStorage is domain-isolated, so URL parameters are the
cross-domain bridge!
```

### **Scenario 3: Session Management**
```
1. User closes browser, comes back later
2. Opens Main App → Still authenticated
3. JWT tokens automatically refresh if needed
4. Consistent experience across sessions
```

## 🛠 Local Development

```bash
npm install
npm start
# Runs on http://localhost:3000
```

## ⚙️ Environment Configuration

Create `.env.local`:
```env
# Cognito Configuration (from your User Pool)
REACT_APP_COGNITO_AUTHORITY=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX
REACT_APP_COGNITO_CLIENT_ID=your-client-id-here
REACT_APP_COGNITO_DOMAIN=https://your-domain.auth.us-east-1.amazoncognito.com

# API Integration
REACT_APP_API_BASE_URL=http://localhost:3001/api

# Cross-App Navigation
REACT_APP_MAIN_APP_URL=http://localhost:3000
REACT_APP_ADMIN_APP_URL=http://localhost:3001

# Feature Flags (Phase 2 — set to true to enable Auth0 SSO option)
REACT_APP_USE_EXTERNAL_IDP=false
REACT_APP_ENABLE_MFA=false
REACT_APP_ENABLE_SOCIAL_LOGIN=false
```

## 🚀 Production Deployment

**Deploy to AWS Amplify:**
1. Connect GitHub repository to Amplify
2. Set environment variables in Amplify Console
3. Update Cognito callback URLs with Amplify domain
4. Automatic deployment on git push

## 🔧 Technical Implementation

### **Key Components**

**`App.js`** - Main application orchestrator
- Manages authentication state via `tokenManagerInstance` (AWS Amplify)
- Renders `AuthSelection` when unauthenticated
- Handles sign-out and session refresh

**`components/AuthSelection.js`** - Authentication method selector (Phase 2)
- Renders native Cognito sign-in button always
- Conditionally renders "Sign In with SSO" button when `REACT_APP_USE_EXTERNAL_IDP=true`
- Calls `tokenManagerInstance.signIn(method)` to initiate the chosen flow

**`components/Dashboard.js`** - User experience showcase
- Displays personalized user information
- Demonstrates API integration
- Shows cross-app navigation

**`components/Navigation.js`** - Ecosystem navigation
- Links to all applications in POC
- Shows user context and role
- Provides sign-out functionality

**`hooks/useSubdomainAuth.js`** - Legacy authentication hook *(preserved for reference)*
- Original OIDC implementation using `react-oidc-context`
- No longer used as the primary auth orchestrator in `App.js`
- Retained for reference and backward compatibility

**`utils/tokenManager.js`** - Token management (Amplify + legacy)
- **Instance methods** (`tokenManagerInstance`): Amplify Auth-based sign-in, session, and sign-out
- **`signIn(method)`**: Routes to native Cognito (`Auth.federatedSignIn()`) or External IDP (`Auth.federatedSignIn({ provider: 'Auth0' })`)
- **Static methods** (`TokenManager.getTokens()`, `validateToken()`, etc.): Legacy cross-subdomain token storage in sessionStorage/localStorage — preserved for backward compatibility

**`config.js`** - Central configuration
- `cognitoConfig` with `external_idp` block (enabled by feature flag)
- `featureFlags` driven by `REACT_APP_USE_EXTERNAL_IDP` env var
- `authMethods` constants: `NATIVE_COGNITO` and `EXTERNAL_IDP`

### **POC Success Criteria**
- ✅ User can sign up/in via Cognito (native flow)
- ✅ Profile information displays correctly  
- ✅ Cross-domain navigation to Admin Portal works
- ✅ API calls authenticate properly with JWT tokens
- ✅ Amplify session shared for cross-app SSO
- ✅ Legacy token fallback (sessionStorage/localStorage) for cross-subdomain compatibility
- ✅ Sign-out clears all authentication
- ✅ *(Phase 2)* `REACT_APP_USE_EXTERNAL_IDP=true` shows External IDP option in `AuthSelection`
- ✅ *(Phase 2)* Auth0 SSO redirects through Cognito federation and returns valid JWT tokens