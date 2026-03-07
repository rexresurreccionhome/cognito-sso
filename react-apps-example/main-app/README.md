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
                       │ in sessionStorage│
                       └─────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ SSO TOKEN SHARING   │
                    │ Available to:       │
                    │ • Admin Portal     │◄─── Other apps can now
                    │ • Future Apps      │     auto-authenticate!
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

### ✅ **Cross-App Integration**
- **Token Sharing** via sessionStorage for seamless SSO
- **Redirect Handling** for users coming from other apps
- **Universal Sign-Out** that clears tokens across all applications
- **Role Display** showing user permissions and capabilities

## 🔗 Connections to Other POC Components

### **→ Admin Portal Integration**
```javascript
// When user clicks "Admin Portal" button:
1. Main App provides the JWT tokens via sessionStorage
2. Admin Portal reads tokens and validates user role
3. If user has 'admin' role → Access granted
4. If user is regular user → "Access Denied" message
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

### **Scenario 2: Cross-App Navigation**
```
1. User authenticated in Main App
2. Clicks "Admin Portal" link
3. Admin Portal automatically authenticates (SSO!)
4. No re-login required - seamless experience
5. User switches between apps freely
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
- Handles authentication state management
- Manages cross-app redirects
- Integrates all POC scenarios

**`components/Dashboard.js`** - User experience showcase
- Displays personalized user information
- Demonstrates API integration
- Shows cross-app navigation

**`components/Navigation.js`** - Ecosystem navigation
- Links to all applications in POC
- Shows user context and role
- Provides sign-out functionality

**`hooks/useSubdomainAuth.js`** - SSO magic implementation
- Cross-domain token sharing
- Automatic authentication detection
- Session management across apps

**`utils/tokenManager.js`** - Security foundation
- JWT token storage and validation
- Cross-app token sharing mechanism
- Authentication state persistence

### **POC Success Criteria**
- ✅ User can sign up/in via Cognito
- ✅ Profile information displays correctly
- ✅ Navigation to Admin Portal works
- ✅ API calls authenticate properly
- ✅ Tokens are shared across domains
- ✅ Session persists across browser restarts
- ✅ Sign-out clears all authentication