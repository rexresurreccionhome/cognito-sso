# Admin Portal - Cognito SSO POC 🔧

## 🎯 Purpose in the POC

This application demonstrates **role-based access control** and **seamless cross-domain SSO**. It represents:

**Business Scenario**: **Administrative Management Interface**
- HR dashboard for user management and system monitoring
- IT portal for system statistics and security oversight  
- Executive dashboard for operational metrics
- Restricted access requiring special permissions

## 🔐 Role-Based Security Demonstration

```
USER ACCESS MATRIX:
┌─────────────────────┬─────────────────┬─────────────────┐
│   User Role         │   Main App      │  Admin Portal   │
├─────────────────────┼─────────────────┼─────────────────┤
│ Regular Employee    │      ✅ Yes     │      ❌ No      │
│ (custom:role=user)  │   Full Access   │  Access Denied  │
├─────────────────────┼─────────────────┼─────────────────┤
│ Administrator       │      ✅ Yes     │      ✅ Yes     │
│ (custom:role=admin) │   Full Access   │  Full Access    │
└─────────────────────┴─────────────────┴─────────────────┘

This demonstrates how the SAME authentication system 
can provide DIFFERENT access levels based on user roles.
```

## 🔄 SSO Integration with Main App

```
CROSS-DOMAIN SSO FLOW:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ User signed in  │───▶│ Clicks "Admin   │───▶│ Admin Portal    │
│ to Main App     │    │ Portal" link    │    │ (This app)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                              ┌────────────────────────┘
                              ▼
                    ┌─────────────────────┐
                    │ Reads JWT tokens    │
                    │ from sessionStorage │◄─── Shared across domains
                    └─────────────────────┘
                              │
                              ▼
                 ┌─────────────────────────────┐
                 │ Role Check:                 │
                 │ • custom:role = "admin"? ✅  │───▶ Show Dashboard
                 │ • custom:role = "user"? ❌   │───▶ Access Denied  
                 └─────────────────────────────┘
```

### ✅ **Seamless SSO Experience**
- **Zero Re-Authentication** - Users already signed in to Main App get instant access
- **Token Inheritance** - Reads JWT tokens from shared sessionStorage
- **Role Validation** - Checks `custom:role` attribute from Cognito
- **Graceful Fallback** - Redirects to Main App if not authenticated

### ✅ **Administrative Features**
- **System Dashboard** - Metrics, user counts, API statistics
- **User Management** - View all users, roles, and activity
- **System Logs** - Recent activity and security events
- **Admin Actions** - System maintenance and configuration

### ✅ **Security Implementation**
- **Role-Based UI** - Different interfaces based on user permissions
- **API Authorization** - Admin-only endpoints with proper JWT validation
- **Audit Trail** - All admin actions are logged and tracked
- **Secure Navigation** - Links back to other ecosystem applications

## 🔗 Integration with POC Ecosystem

### **← From Main App**
```
User Journey:
1. User signs in via Main App
2. JWT tokens stored in sessionStorage
3. User clicks "Admin Portal" navigation
4. Admin Portal auto-authenticates using stored tokens
5. Role check determines access level
```

### **→ To API Backend**
```
API Interactions:
• GET /api/admin/stats - System statistics (admin only)
• GET /api/admin/users - User management data (admin only)  
• GET /api/admin/logs - System logs (admin only)
• All requests include Bearer JWT token for validation
```

### **↔ Business Value**
| Scenario | Value Proposition |
|----------|------------------|
| **HR Manager** | Access employee data without separate login |
| **IT Administrator** | Monitor systems using same company credentials |
| **Security Officer** | Review logs with proper access controls |
| **Executive** | View metrics without managing multiple passwords |

## 🧪 POC Testing Scenarios

### **Scenario A: Regular User (Access Denied)**
```
1. Sign in to Main App as regular user
2. Navigate to Admin Portal (localhost:3001)
3. See "Access Denied" message
4. Observe role-based security in action
```

### **Scenario B: Admin User (Full Access)**
```
1. Set custom:role = "admin" in Cognito Console
2. Sign in to Main App
3. Navigate to Admin Portal → Instant access! (SSO)
4. Explore admin dashboard, user management, logs
5. Test admin-only API endpoints
```

### **Scenario C: Cross-Domain Security**
```
1. Sign out of Main App
2. Try to access Admin Portal directly
3. Redirected to Main App for authentication
4. After sign-in, automatically returned to Admin Portal
```

## ⚙️ Setting Up Admin Access

**To test admin functionality:**

1. **Via AWS Cognito Console:**
   ```
   AWS Console → Cognito → User pools → Your pool
   → Users → Select your user → Edit attributes  
   → Add: custom:role = admin
   ```

2. **Via API (if implemented):**
   ```bash
   curl -X PUT \
     -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"role": "admin"}' \
     http://localhost:3001/api/admin/users/USER_ID/role
   ```

## 🛠 Local Development

```bash
npm install
# Run on different port to simulate cross-domain
BROWSER=none PORT=3001 npm start
# Access at http://localhost:3001
```

## 🌐 Environment Configuration

Create `.env.local`:
```env
# Same Cognito config as Main App
REACT_APP_COGNITO_AUTHORITY=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX
REACT_APP_COGNITO_CLIENT_ID=your-client-id-here
REACT_APP_COGNITO_DOMAIN=https://your-domain.auth.us-east-1.amazoncognito.com

# API and Cross-App URLs
REACT_APP_API_BASE_URL=http://localhost:3001/api  # Points to shared API
REACT_APP_MAIN_APP_URL=http://localhost:3000      # Link back to main
REACT_APP_ADMIN_APP_URL=http://localhost:3001     # This app's URL

# Feature Flags (Phase 2 — keep in sync with main app)
REACT_APP_USE_EXTERNAL_IDP=false
REACT_APP_ENABLE_MFA=false
REACT_APP_ENABLE_SOCIAL_LOGIN=false
```

## 🏗 Technical Architecture

### **Key Components:**

**`App.js`** - Role-based application controller
- Primary auth check via `tokenManagerInstance` (AWS Amplify)
- Legacy fallback: reads tokens from `TokenManager.getTokens()` (sessionStorage/localStorage) for cross-subdomain SSO
- Renders `AuthSelection` when unauthenticated
- Validates `custom:role` attribute for admin access

**`components/AuthSelection.js`** - Authentication method selector (Phase 2)
- Same as main-app but with admin-specific labels
- Conditionally shows "Enterprise SSO" option when `REACT_APP_USE_EXTERNAL_IDP=true`

**`components/AdminDashboard.js`** - Administrative interface
- System metrics and statistics
- User management table
- System logs viewer
- Administrative actions panel

**`components/Navigation.js`** - Admin-aware navigation
- Shows user role in interface
- Links to other ecosystem apps
- Admin-specific styling and branding

**`utils/tokenManager.js`** - Token management (Amplify + legacy)
- **Instance methods** (`tokenManagerInstance`): Amplify Auth-based sign-in, session, and sign-out
- **Static methods** (`TokenManager.getTokens()`, `validateToken()`, etc.): Legacy cross-subdomain token storage — preserved for SSO token inheritance from main app

### **POC Success Validation:**
- ✅ Regular users cannot access admin features
- ✅ Admin users get seamless SSO experience (Amplify session or legacy token fallback)
- ✅ Role-based UI shows different content
- ✅ Admin API endpoints work with proper tokens
- ✅ Navigation between apps is seamless
- ✅ Session management works across domains
- ✅ *(Phase 2)* `REACT_APP_USE_EXTERNAL_IDP=true` shows Enterprise SSO option in `AuthSelection`
- ✅ *(Phase 2)* Auth0-federated users with `custom:role=admin` can access the admin portal