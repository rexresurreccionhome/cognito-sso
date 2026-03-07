# POC Planning Overview

## Architecture Options
1. **Native AWS Cognito Flow**: Users authenticate directly with Cognito User Pool
2. **External IDP Integration**: Users authenticate via external provider (Google, Facebook, SAML, OIDC) that federates with Cognito

## Authentication Flow for POC

### OAuth 2.0 Authorization Code Grant + OpenID Connect (OIDC)

For this POC, we'll implement the **OAuth 2.0 Authorization Code Grant Flow with OpenID Connect** using AWS Cognito's Hosted UI. This is the modern, secure standard for web application authentication.

### Flow Characteristics
- **Protocol**: OAuth 2.0 with OpenID Connect extension
- **Grant Type**: Authorization Code Grant  
- **UI Type**: Hosted UI (AWS Cognito manages the login page)
- **Token Type**: JWT (JSON Web Tokens)
- **Security**: Code exchange prevents token exposure in browser
- **Standards**: Industry-standard, widely adopted

### Authentication Flow Diagram

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    User     │────▶│   Web App       │────▶│  Cognito Hosted │
│             │  1  │ (app.domain.com)│  2  │      UI         │
└─────────────┘     └─────────────────┘     └─────────────────┘
       │                     │                       │
       │                  Redirect to                │
       │               /oauth2/authorize              │
       │                                             │
       │                                             ▼
       │                                    ┌─────────────────┐
       │                              3     │ User enters     │
       │◀───────────────────────────────────│ credentials &   │
       │    Login form display              │ authenticates   │
       │                                    └─────────────────┘
       │                                             │
       │                                             │ 4
       │                                             ▼
       │              ┌──────────────────────────────────────┐
       │              │     Authorization Code Response      │
       │              │ /auth/callback?code=ABC123&state=XYZ │
       │              └──────────────────┬───────────────────┘
       │                                 │ 5
       │                                 ▼
       │              ┌─────────────────────────────────────┐
       │              │        Token Exchange               │
       │              │ POST /oauth2/token                  │
       │              │ Body: {                             │
       │              │   grant_type: "authorization_code", │
       │              │   code: "ABC123",                   │
       │              │   redirect_uri: "callback_url"      │
       │              │ }                                   │
       │              └─────────────────┬───────────────────┘
       │                                │ 6
       │                                ▼
       │              ┌─────────────────────────────────────┐
       │              │        JWT Tokens Response          │
       │              │ {                                   │
       │              │   "id_token": "eyJ...",            │
       │              │   "access_token": "eyJ...",         │
       │              │   "refresh_token": "eyJ...",        │
       │              │   "expires_in": 3600                │
       │              │ }                                   │
       │              └─────────────────┬───────────────────┘
       │                                │ 7
       │                                ▼
       │              ┌─────────────────────────────────────┐
       │              │     Store Tokens & Redirect         │
       │              │ - sessionStorage.setItem(tokens)    │
       │              │ - Navigate to /dashboard            │
       │              └─────────────────────────────────────┘
       │                                │
       │                                │ 8
       ▼                                ▼
┌─────────────────┐            ┌─────────────────┐
│ Cross-Subdomain │            │ API Calls with  │
│ Token Sharing   │            │ Bearer Tokens   │
│                 │            │                 │
│ admin.domain.com│◀──────────▶│ api.domain.com  │
│ Other apps      │   Token    │ Protected       │
│                 │ Validation │ Resources       │
└─────────────────┘            └─────────────────┘
```

### Step-by-Step Process Explanation

#### 1. **Initial Authentication Request**
```javascript
// User clicks "Login" button
Auth.federatedSignIn();

// Redirects to:
// https://your-domain.auth.region.amazoncognito.com/oauth2/authorize?
//   response_type=code&
//   client_id=your-client-id&
//   redirect_uri=https://app.domain.com/auth/callback&
//   scope=openid+email+profile&
//   state=random-state-value
```

#### 2. **User Authentication at Cognito**
- User sees AWS Cognito Hosted UI login page
- Enters username/password or uses social login
- Cognito validates credentials

#### 3. **Authorization Code Response**
```javascript
// Cognito redirects back with authorization code:
// https://app.domain.com/auth/callback?code=AUTHORIZATION_CODE&state=STATE_VALUE
```

#### 4. **Token Exchange (Behind the Scenes)**
```javascript
// AWS Amplify automatically exchanges code for tokens
const tokenRequest = {
  grant_type: "authorization_code",
  code: "AUTHORIZATION_CODE",  
  redirect_uri: "https://app.domain.com/auth/callback",
  client_id: "your-client-id"
};
```

#### 5. **JWT Tokens Received**
```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIs...",      // User identity
  "access_token": "eyJhbGciOiJSUzI1NiIs...",  // API access
  "refresh_token": "eyJjdHkiOiJKV1QiLCJlbmM...", // Token refresh
  "token_type": "Bearer",
  "expires_in": 3600
}
```

#### 6. **Token Storage and Session Management**
```javascript
// Store tokens for cross-subdomain sharing
const tokens = {
  accessToken: session.getAccessToken().getJwtToken(),
  idToken: session.getIdToken().getJwtToken(),
  refreshToken: session.getRefreshToken().getToken(),
};
sessionStorage.setItem('cognitoTokens', JSON.stringify(tokens));
```

#### 7. **Cross-Subdomain SSO**
```javascript
// When user visits admin.domain.com:
// 1. Check for stored tokens
// 2. Validate token expiration  
// 3. If valid → Auto-authenticate
// 4. If expired → Refresh or redirect to login
```

#### 8. **API Authentication**
```javascript
// All API calls include Bearer token
const response = await fetch('https://api.domain.com/protected', {
  headers: {
    'Authorization': `Bearer ${tokens.accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### Token Types Explained

#### **ID Token (OpenID Connect)**
- **Purpose**: Proves user identity
- **Contains**: User info (email, name, sub, etc.)
- **Usage**: Client-side user identification
- **Lifetime**: Short (1 hour typical)

#### **Access Token (OAuth 2.0)**  
- **Purpose**: API authorization
- **Contains**: Scopes, permissions, user reference
- **Usage**: Server-side API authentication
- **Lifetime**: Short (1 hour typical)

#### **Refresh Token**
- **Purpose**: Obtain new access/ID tokens
- **Contains**: Encrypted refresh credentials
- **Usage**: Background token renewal
- **Lifetime**: Long (days/weeks)

### Security Benefits

1. **Authorization Code Flow**: More secure than implicit flow
2. **Hosted UI**: AWS manages security updates and compliance
3. **JWT Tokens**: Stateless, digitally signed, tamper-evident
4. **HTTPS Only**: All communications encrypted
5. **State Parameter**: CSRF protection
6. **Short-lived Tokens**: Reduces security exposure
7. **Refresh Mechanism**: Seamless token renewal

### Why This Flow for POC?

- ✅ **Industry Standard**: OAuth 2.0 + OIDC widely adopted
- ✅ **Secure**: Current best practices implemented  
- ✅ **Simple Integration**: AWS Amplify handles complexity
- ✅ **Scalable**: Works from POC to enterprise production
- ✅ **Future-proof**: Can add external IDPs later
- ✅ **Cross-platform**: Works with web, mobile, APIs

## Technology Stack Recommendations (Free Options)

### Core Services
- **AWS Cognito** (Free tier: 50,000 MAUs)
- **Frontend**: React, Vue, or vanilla JavaScript with AWS Amplify SDK
- **Backend**: AWS Lambda + API Gateway (generous free tier)
- **Hosting**: AWS S3 + CloudFront or Vercel/Netlify

### Free External IDP Options for Testing

#### OIDC Providers
- **Auth0** (7,000 free MAUs)
- **Okta Developer** (100 users free)
- **Google OAuth 2.0** (free)
- **Microsoft Azure AD B2C** (50,000 MAUs free)
- **Keycloak** (self-hosted, completely free)

#### SAML Providers
- **Okta Developer** (free tier includes SAML)
- **Auth0** (SAML support in free tier)
- **OneLogin Developer** (free tier available)
- **SAML Tracer** browser extension for testing
- **SimpleSAMLphp** (self-hosted, free)

## Key Concepts Explained

### Identity Pool vs User Pool

**User Pool**:
- **Purpose**: User directory service for authentication
- **Features**: Sign-up, sign-in, user management, MFA, password policies
- **Use Case**: When you need to manage user credentials and authentication
- **Output**: JWT tokens (ID, Access, Refresh tokens)
- **Think**: "Who is this user and are their credentials valid?"

**Identity Pool (Federated Identities)**:
- **Purpose**: Authorization service that provides AWS credentials
- **Features**: Maps authenticated users to AWS IAM roles
- **Use Case**: When users need direct access to AWS services (S3, DynamoDB, etc.)
- **Output**: AWS STS credentials (AccessKeyId, SecretAccessKey, SessionToken)
- **Think**: "What AWS resources can this authenticated user access?"

**Common Pattern**: User Pool for authentication → Identity Pool for AWS resource authorization

### SAML vs OIDC

**SAML (Security Assertion Markup Language)**:
- **Format**: XML-based
- **Use Case**: Enterprise SSO, typically browser-based
- **Complexity**: More complex setup, enterprise-focused
- **Tokens**: SAML assertions (XML)
- **Best For**: Large enterprises, existing SAML infrastructure

**OIDC (OpenID Connect)**:
- **Format**: JSON-based, built on OAuth 2.0
- **Use Case**: Modern web/mobile apps, API access
- **Complexity**: Simpler setup, developer-friendly
- **Tokens**: JWT tokens
- **Best For**: Modern applications, mobile apps, APIs

### When to Use OIDC vs SAML

#### Choose OIDC When:
- **Technical Scenarios**:
  - Modern web/mobile applications
  - Single Page Applications (SPAs)
  - Microservices architecture
  - API-first applications

- **Organizational Context**:
  - Greenfield projects
  - Developer-centric teams
  - Consumer-facing applications
  - Startups/SMBs

#### Choose SAML When:
- **Technical Scenarios**:
  - Enterprise web applications
  - Browser-based SSO
  - High security requirements
  - Complex attribute sharing

- **Organizational Context**:
  - Large enterprises
  - Legacy system integration
  - Compliance requirements
  - IT-managed environments

### When to Use Identity Pool

#### Use Identity Pool When:
- **Frontend needs AWS resources** - S3 uploads, DynamoDB queries, Lambda invocations
- **Mobile apps accessing AWS** - Direct API calls without backend proxy
- **Client-side file uploads** - Direct S3 uploads from browser/mobile
- **Real-time features** - IoT Core, AppSync GraphQL subscriptions

#### DON'T Use Identity Pool When:
- **Traditional web apps** - Backend handles all AWS interactions
- **API-first architecture** - Frontend only calls your APIs
- **Sensitive operations** - Complex business logic in backend
- **Audit requirements** - Need detailed logging of all operations

## Recommended POC Implementation Plan

### Phase 1: Basic Cognito Setup
1. Create User Pool with basic configuration
2. Build simple web app with sign-up/sign-in
3. Test native Cognito authentication

### Phase 2: External IDP Integration
1. Set up one OIDC provider (start with Google - easiest)
2. Configure User Pool to federate with external IDP
3. Test federated authentication flow

### Phase 3: Advanced Features
1. Add SAML provider (Okta Developer)
2. Implement Identity Pool for AWS resource access
3. Add MFA and advanced security features

### Phase 4: Production Considerations
1. Custom domain setup
2. Advanced security configurations
3. Monitoring and logging

## Free Sandbox Resources

### OIDC Testing
- **Google OAuth Playground**: https://developers.google.com/oauthplayground/
- **Auth0 Dashboard**: Free account with testing capabilities
- **JWT.io**: Decode and verify JWT tokens

### SAML Testing
- **SAML Tool**: Online SAML encoder/decoder
- **Auth0 SAML Tester**: Built-in testing tools
- **Okta Developer Console**: SAML app simulation

## Sample Architecture Flow

```
User → Web App → Cognito User Pool → External IDP (optional)
                      ↓
                 Identity Pool → AWS Resources
```

## Decision Matrix for Your POC

| Scenario | Use OIDC | Use SAML | Use Identity Pool |
|----------|----------|----------|-------------------|
| Modern web app with social login | ✅ | ❌ | Maybe |
| Enterprise customer requirements | Maybe | ✅ | Maybe |
| Direct S3 file uploads | Either | Either | ✅ |
| Real-time chat features | ✅ | ❌ | ✅ |
| Simple authentication only | ✅ | Either | ❌ |
| Mobile application | ✅ | ❌ | ✅ |
| Legacy enterprise integration | Maybe | ✅ | ❌ |

## Getting Started Recommendations

1. **Start Simple**: Begin with native Cognito authentication
2. **Use Amplify**: AWS Amplify simplifies Cognito integration
3. **Test Incrementally**: Add one IDP at a time
4. **Document Everything**: Keep track of configurations for different IDPs
5. **Begin with OIDC**: Easier to implement and debug than SAML
6. **Skip Identity Pool initially**: Unless you specifically need direct AWS resource access

## Cost Considerations

### Free Tier Limits
- **AWS Cognito**: 50,000 MAUs (Monthly Active Users)
- **AWS Lambda**: 1M requests/month
- **API Gateway**: 1M API calls/month
- **S3**: 5GB storage + 20,000 GET requests

### Estimated Monthly Costs (Beyond Free Tier)
- **Small POC** (< 1,000 users): $0-10/month
- **Medium Test** (1,000-10,000 users): $10-50/month
- **Production Ready** (10,000+ users): $50+/month

## Security Best Practices for POC

1. **Use HTTPS everywhere** - Never transmit tokens over HTTP
2. **Implement proper token storage** - Use secure storage mechanisms
3. **Set appropriate token expiration** - Short-lived access tokens
4. **Validate tokens server-side** - Don't trust client-side validation only
5. **Use least privilege IAM policies** - Minimal required permissions
6. **Enable CloudTrail logging** - Track all authentication events
7. **Test with different user scenarios** - Admin, regular user, guest access