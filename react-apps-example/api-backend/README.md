# API Backend - Cognito SSO POC 🚀

## 🎯 Purpose in the POC

This Node.js/Express API serves as the **centralized data and business logic layer** for the entire POC ecosystem. It demonstrates:

**Business Scenario**: **Shared Enterprise Services**
- Single API serving multiple front-end applications
- Centralized authentication and authorization
- Role-based data access and business logic
- Scalable microservices architecture pattern

## 🛡️ Security & Authentication Hub

```
JWT VALIDATION ARCHITECTURE:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Main App      │───▶│   API Backend   │◄───│ Admin Portal    │
│ (localhost:3000)│    │ (localhost:3001)│    │ (localhost:3001)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
Bearer eyJhbGciOiJSUzI1... ──▶ JWT VALIDATION ◄── Bearer eyJhbGciOiJSUzI1...
        │                       │                       │
        ▼                       ▼                       ▼
   🔍 Token decoded      📋 JWKS validation      🎫 Role extracted
   📧 User identified    🔐 Signature verified   ⚡ Permission granted
```

## 🏗️ Role-Based API Architecture

```
API ENDPOINT TIERS:
┌─────────────────────────────────────────────────────────────┐
│                    🌍 PUBLIC ENDPOINTS                     │
│ /api/health, /api/info, /api/docs                          │
│ ✅ No authentication required                               │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                 🔒 PROTECTED ENDPOINTS                      │
│ /api/protected/* (profile, test, activity)                 │
│ ✅ JWT token required ✅ Any authenticated user             │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                  🛡️ ADMIN ENDPOINTS                        │
│ /api/admin/* (stats, users, logs, maintenance)             │
│ ✅ JWT token required ✅ custom:role = "admin" required     │
└─────────────────────────────────────────────────────────────┘
```

### **↔ Main App Integration**
```javascript
// Main App makes these API calls:
GET /api/protected/profile     // User profile information
GET /api/protected/test        // Authentication validation  
GET /api/protected/activity    // User activity history
PUT /api/protected/profile     // Update user information

// All requests include: Authorization: Bearer <jwt-token>
```

### **↔ Admin Portal Integration**
```javascript
// Admin Portal makes these API calls:
GET /api/admin/stats          // System metrics & statistics
GET /api/admin/users          // User management data
GET /api/admin/logs           // System activity logs
PUT /api/admin/users/:id/role // Role management (super-admin only)
POST /api/admin/maintenance   // System maintenance controls

// All requests require admin role validation
```

### **🎯 Business Value Demonstration**
| API Feature | Business Impact |
|-------------|----------------|
| **Single JWT Validation** | One authentication system for all apps |
| **Role-Based Endpoints** | Different data access based on job function |
| **CORS Management** | Secure cross-domain communication |
| **Rate Limiting** | Protection against abuse and overuse |
| **Comprehensive Logging** | Full audit trail for compliance |
| **Health Monitoring** | Proactive system health management |

## 🌟 Key POC Features

### 🌍 **Public Endpoints** (No Authentication)
```
GET  /api/health              Health check & system status
GET  /api/info                API information & endpoint list
GET  /api/docs                Interactive API documentation
```

### 🔒 **Protected Endpoints** (Authentication Required)
```
GET  /api/protected/profile      Current user profile
GET  /api/protected/permissions  User permissions by role
GET  /api/protected/activity     User activity history
GET  /api/protected/test         Authentication test
PUT  /api/protected/profile      Update user profile
```

### 🛡️ **Admin Endpoints** (Admin Role Required)
```
GET  /api/admin/stats           System statistics
GET  /api/admin/users           User management (paginated)
GET  /api/admin/logs            System logs (filtered)
PUT  /api/admin/users/:id/role  Update user role (super-admin only)
POST /api/admin/maintenance     System maintenance mode
```

## 🧪 POC Testing Scenarios

### **Scenario A: Public API Access**
```bash
# Anyone can access public endpoints
curl http://localhost:3001/api/health
curl http://localhost:3001/api/docs
```

### **Scenario B: Authenticated User**
```bash
# Get JWT token from Main App, then test:
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3001/api/protected/profile
```

### **Scenario C: Admin User**
```bash
# Admin user can access admin endpoints:
curl -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
     http://localhost:3001/api/admin/stats
```

### **Scenario D: Role-Based Access Control**
```bash
# Regular user tries admin endpoint (should fail):
curl -H "Authorization: Bearer USER_JWT_TOKEN" \
     http://localhost:3001/api/admin/users
# Returns: 403 Forbidden
```

## 🛠 Local Development Setup

```bash
npm install
npm run dev  # Uses nodemon for auto-restart
# Server runs on http://localhost:3001
```

## ⚙️ Environment Configuration

Create `.env`:
```env
# Server Configuration
NODE_ENV=development
PORT=3001

# AWS Cognito Configuration (from your User Pool)
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_REGION=us-east-1
COGNITO_APP_CLIENT_ID=your-client-id-here

# CORS Configuration (frontend URLs)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Security Configuration
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100      # 100 requests per window
TRUST_PROXY=false               # Set true if behind load balancer
```

## 🚀 Deployment Options

### AWS Lambda (Serverless)

#### Creating Deployment Package
```bash
# Clean install dependencies and create deployment package
rm -rf node_modules package-lock.json
npm install
zip -r ../../api-backend-lambda-v$(date +%Y%m%d_%H%M%S).zip . -x "*.git*" "*.DS_Store*" "node_modules/.cache/*"
```

#### Deploy to Lambda
```bash
# Option 1: AWS Console Upload
# Download the generated zip file and upload via AWS Lambda Console

# Option 2: AWS CLI
aws lambda update-function-code \
  --function-name your-lambda-function-name \
  --zip-file fileb://api-backend-lambda-v[TIMESTAMP].zip
```

#### Lambda Configuration
- **Runtime**: Node.js 18.x or later
- **Handler**: `index.handler`
- **Environment Variables**: Set your Cognito configuration
- **Timeout**: 30 seconds recommended
- **Memory**: 256MB recommended

### Serverless Framework
```bash
npm install -g serverless
npm install serverless-http serverless-offline
serverless deploy
```

### Docker Container
```bash
docker build -t cognito-sso-api .
docker run -p 3001:3001 --env-file .env cognito-sso-api
```

### AWS App Runner / ECS
Use the included `Dockerfile` for containerized deployment.

## Security Features

- **JWT Signature Validation**: Verifies tokens using AWS Cognito JWKS
- **Role-Based Access Control**: Different endpoints for different roles
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Only allowed origins can access
- **Security Headers**: Helmet.js for additional security
- **Request Logging**: Morgan for access logs

## 🎭 POC Success Demonstration

This API backend completes the POC by proving:

### ✅ **Enterprise SSO Capabilities**
- **Single Sign-On**: One login works across all applications
- **Centralized Authentication**: JWT validation happens in one place
- **Role-Based Security**: Different users see different data/features
- **Cross-Domain Architecture**: API serves multiple frontend origins

### ✅ **Business Scenarios Validated**
1. **Employee Portal Access**: Main app users get their profile data
2. **Admin Dashboard Integration**: Admin users access management features
3. **API Security**: Unauthenticated requests are properly rejected
4. **Scalable Architecture**: One API can serve unlimited frontend apps

### ✅ **Technical Architecture Proof**
- **JWT Token Sharing**: Tokens work across all applications seamlessly
- **Microservices Pattern**: API can be deployed independently
- **Cloud-Native Design**: Ready for AWS Lambda, containers, or traditional deployment
- **Development Experience**: Clear documentation and testing scenarios

## File Structure

```
api-backend/
├── middleware/
│   └── auth.js                # 🔐 JWT authentication & role validation
├── routes/
│   ├── public.js             # 🌍 Health checks & documentation
│   ├── protected.js          # 👤 User profile & activity endpoints
│   └── admin.js              # 👑 Administrative & management endpoints
├── server.js                 # 🚀 Express app with security middleware
├── lambda.js                 # ⚡ Serverless deployment wrapper
├── package.json
├── Dockerfile               # 🐳 Container deployment configuration
└── serverless.yml           # ☁️ AWS Lambda deployment configuration
```

## 🌐 POC Ecosystem Integration

```
                    🎯 COMPLETE POC ARCHITECTURE
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  👥 USERS                🔐 AUTHENTICATION         💾 DATA     │
│                                                                │
│  Employee ──┐           ┌─ AWS Cognito ──┐        ┌─ Mock Data │
│  Admin ─────┼──────────▶│  User Pool     │◄───────┼─ JWT Claims│
│  Manager ───┘           │  • OAuth 2.0   │        │  • Profile │
│                         │  • OpenID      │        │  • Roles   │
│                         │  • JWT Tokens  │        │  • Stats   │
│                         └────────────────┘        └───────────│
│                                 │                              │
│  🖥️ FRONTEND APPS              │              🔧 API BACKEND  │
│                                 ▼                              │
│  Main App ──────┐      ┌── Token Validation ──┐      ┌── Public │
│  (Employee)     │      │   • JWKS Signature    │      │  Health │
│                 ├─────▶│   • Expiry Check      │◄─────┤  Docs  │
│  Admin Portal ──┘      │   • Role Extraction   │      └── Info  │
│  (Management)           └───────────────────────┘              │
│                                 │                              │
│                                 ▼                              │
│                        ┌── Role-Based Routes ──┐             │
│                        │  • Protected (/user)   │             │
│                        │  • Admin (/admin)      │             │
│                        │  • Public (/health)    │             │
│                        └─────────────────────────┘             │
└────────────────────────────────────────────────────────────────┘
```

**💡 POC Value Proposition**: This architecture demonstrates how a single authentication system (AWS Cognito) can secure multiple applications with different roles and permissions, all backed by a centralized API that enforces business rules and data access controls.