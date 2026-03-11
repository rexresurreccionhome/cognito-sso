# Deployment Guide - Cognito SSO Project

This guide walks you through deploying the complete Cognito SSO project to AWS using various deployment strategies.

## 🎯 Deployment Overview

This project consists of three components:
1. **Main App** (React) → AWS Amplify
2. **Admin Portal** (React) → AWS Amplify  
3. **API Backend** (Node.js) → AWS Lambda or ECS

## 🔧 Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Node.js 16+ installed
- Git repository (GitHub, GitLab, etc.)
- Auth0 account *(required only for Phase 2 External IDP feature — skip if using native Cognito only)*

## 📋 Pre-Deployment Checklist

- [ ] AWS Cognito User Pool created and configured
- [ ] Environment variables documented
- [ ] Applications tested locally
- [ ] Code committed to Git repository
- [ ] Domain names decided (optional)
- [ ] *(Phase 2)* Auth0 tenant created and Cognito SAML/OIDC connection configured
- [ ] *(Phase 2)* Auth0 registered as Identity Provider in Cognito User Pool
- [ ] Feature flag `REACT_APP_USE_EXTERNAL_IDP` decision made (default: `false`)

## 🚀 Step 1: Deploy Main App to Amplify

### 1.1 Create Amplify App

1. **Open AWS Amplify Console**
   ```
   AWS Console → Amplify → Host web app
   ```

2. **Connect Repository**
   ```
   Source code provider: GitHub
   → Authorize AWS Amplify
   → Select repository: your-cognito-sso-repo
   → Branch: main
   → App name: cognito-sso-main-app
   ```

3. **Configure Build Settings**
   - Amplify will detect `amplify.yml` automatically
   - Build command: `npm run build`
   - Output directory: `build`

### 1.2 Set Environment Variables

In Amplify Console → App Settings → Environment Variables:

```
# Cognito Configuration
REACT_APP_COGNITO_AUTHORITY=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX
REACT_APP_COGNITO_CLIENT_ID=your-client-id
REACT_APP_COGNITO_DOMAIN=https://your-domain.auth.us-east-1.amazoncognito.com

# API & App URLs
REACT_APP_API_BASE_URL=https://your-api-domain.com/api
REACT_APP_MAIN_APP_URL=https://main.amplifyapp.com
REACT_APP_ADMIN_APP_URL=https://admin.amplifyapp.com

# Feature Flags (Phase 2 — set to true to enable Auth0 External IDP)
REACT_APP_USE_EXTERNAL_IDP=false
REACT_APP_ENABLE_MFA=false
REACT_APP_ENABLE_SOCIAL_LOGIN=false
```

> **Phase 2 Note:** Set `REACT_APP_USE_EXTERNAL_IDP=true` in the Amplify Console to enable the Auth0 SSO option in the UI. Requires Auth0 to be configured as an Identity Provider in your Cognito User Pool first (see Step 4.3).

### 1.3 Deploy

```
Review → Save and Deploy
```

### 1.4 Note the URL

Save the generated URL: `https://main.d1234567890.amplifyapp.com`

## 🚀 Step 2: Deploy Admin Portal to Amplify

### 2.1 Create Second Amplify App

Repeat the process for the admin portal:

1. **Create New Amplify App**
   ```
   AWS Console → Amplify → Host web app
   → Connect same repository
   → Branch: main
   → App name: cognito-sso-admin-portal
   ```

2. **Configure Build Settings**
   - Point to `admin-portal` folder
   - Build command: `npm run build`
   - Output directory: `build`

### 2.2 Set Environment Variables

In Amplify Console → App Settings → Environment Variables:

```
# Cognito Configuration (same User Pool as main app)
REACT_APP_COGNITO_AUTHORITY=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX
REACT_APP_COGNITO_CLIENT_ID=your-client-id
REACT_APP_COGNITO_DOMAIN=https://your-domain.auth.us-east-1.amazoncognito.com

# API & App URLs (use actual Amplify-generated URLs)
REACT_APP_API_BASE_URL=https://your-api-domain.com/api
REACT_APP_MAIN_APP_URL=https://main.d1234567890.amplifyapp.com
REACT_APP_ADMIN_APP_URL=https://admin.d9876543210.amplifyapp.com

# Feature Flags (Phase 2 — must match main app setting)
REACT_APP_USE_EXTERNAL_IDP=false
REACT_APP_ENABLE_MFA=false
REACT_APP_ENABLE_SOCIAL_LOGIN=false
```

### 2.3 Note the URL

Save: `https://admin.d9876543210.amplifyapp.com`

## 🚀 Step 3: Deploy API Backend to AWS Lambda

### 3.1 Prepare Lambda Deployment Package

First, create the deployment package locally:

```bash
# Navigate to API backend directory
cd react-apps-example/api-backend

# Install dependencies
npm install

# Create deployment zip file
zip -r api-backend-lambda.zip . -x "*.git*" "*.DS_Store*" "node_modules/.cache/*"
```

### 3.2 Create Lambda Function in AWS Console

1. **Open AWS Lambda Console**: https://console.aws.amazon.com/lambda/
2. **Create Function**:
   - Click **"Create function"**
   - Choose **"Author from scratch"**
   - **Function name**: `cognito-sso-api`
   - **Runtime**: `Node.js 18.x` or `Node.js 20.x`
   - **Architecture**: `x86_64`
   - Click **"Create function"**

### 3.3 Upload Code to Lambda

1. **In the Lambda function page**:
   - Go to **"Code"** tab
   - Click **"Upload from"** → **".zip file"**
   - Upload your `api-backend-lambda.zip` file
   - Click **"Save"**

2. **Configure Handler**:
   - Go to **"Runtime settings"** → **"Edit"**
   - **Handler**: `lambda.handler`
   - Click **"Save"**

### 3.4 Set Lambda Environment Variables

1. **Configuration** tab → **Environment variables** → **Edit**
2. **Add these variables**:
   ```
   NODE_ENV=production
   COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
   COGNITO_REGION=us-east-1
   COGNITO_APP_CLIENT_ID=your-client-id-here
   ALLOWED_ORIGINS=https://main.d1234567890.amplifyapp.com,https://admin.d9876543210.amplifyapp.com
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```
3. Click **"Save"**

### 3.5 Create Function URL (Simple Alternative to API Gateway)

1. **In your Lambda function page**:
   - Go to **"Configuration"** tab
   - Click **"Function URL"** in the left sidebar
   - Click **"Create function URL"**

2. **Configure Function URL**:
   - **Auth type**: `NONE` (we handle auth in our code)
   - **Configure cross-origin resource sharing (CORS)**:
     - Check **"Configure CORS"**
     - **Allow-Origin**: `https://main.d1234567890.amplifyapp.com,https://admin.d9876543210.amplifyapp.com`
     - **Allow-Headers**: `content-type,authorization`
     - **Allow-Methods**: `GET,POST,PUT,DELETE,OPTIONS`
     - **Max age**: `86400`
   - Click **"Save"**

3. **Copy Function URL**:
   - Note the **Function URL**: `https://abc123-xyz789.lambda-url.us-east-1.on.aws/`
   - This is your API base URL (much simpler than API Gateway!)

### 3.6 Test Your Lambda Function URL

Test the API endpoints directly:

```bash
# Test health endpoint
curl https://abc123-xyz789.lambda-url.us-east-1.on.aws/api/health

# Test API info
curl https://abc123-xyz789.lambda-url.us-east-1.on.aws/api/info

# Test protected endpoint (need JWT token from your frontend)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://abc123-xyz789.lambda-url.us-east-1.on.aws/api/protected/profile
```

### 3.7 Update Frontend Environment Variables

Update your Amplify apps with the Lambda Function URL:

**Main App Environment Variables:**
```
REACT_APP_API_BASE_URL=https://abc123-xyz789.lambda-url.us-east-1.on.aws/api
```

**Admin Portal Environment Variables:**
```  
REACT_APP_API_BASE_URL=https://abc123-xyz789.lambda-url.us-east-1.on.aws/api
```

### 3.8 Benefits of Function URL vs API Gateway

✅ **Simpler Setup**: No API Gateway configuration needed  
✅ **Lower Cost**: No API Gateway charges (only Lambda costs)  
✅ **Built-in CORS**: Easy CORS configuration  
✅ **Direct Integration**: One less service to manage  
✅ **Automatic Scaling**: Same Lambda scaling benefits

### 3.9 Lambda Function Monitoring

Monitor your function:
- **CloudWatch Logs**: `/aws/lambda/cognito-sso-api`
- **CloudWatch Metrics**: Invocations, Duration, Error rate
- **Function URL Metrics**: Available in Lambda console

## 🔧 Step 4: Update Cognito Configuration

### 4.1 Update Callback URLs

In AWS Cognito Console → User pools → App integration → App client:

**Callback URLs:**
```
https://main.d1234567890.amplifyapp.com/
https://admin.d9876543210.amplifyapp.com/
```

**Sign-out URLs:**
```
https://main.d1234567890.amplifyapp.com/
https://admin.d9876543210.amplifyapp.com/
```

### 4.2 Update CORS Origins

Update your API deployment with production URLs:
```
ALLOWED_ORIGINS=https://main.d1234567890.amplifyapp.com,https://admin.d9876543210.amplifyapp.com
```

### 4.3 (Phase 2) Configure Auth0 as External Identity Provider

Skip this step if you are not enabling `REACT_APP_USE_EXTERNAL_IDP`.

1. **Create Auth0 Application**
   ```
   Auth0 Dashboard → Applications → Create Application
   → Type: Regular Web Application
   → Allowed Callback URLs: https://your-cognito-domain.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   → Allowed Logout URLs: https://main.d1234567890.amplifyapp.com/
   ```

2. **Add Auth0 as OIDC Identity Provider in Cognito**
   ```
   Cognito Console → User pools → Your pool
   → Sign-in experience → Federated identity provider sign-in
   → Add an identity provider → OpenID Connect
   → Provider name: Auth0  ← must match identity_provider in config.js
   → Client ID: <Auth0 app client ID>
   → Client secret: <Auth0 app client secret>
   → Issuer URL: https://<your-auth0-domain>.us.auth0.com
   → Attribute mapping: email → email, name → name
   ```

3. **Enable Auth0 in App Client**
   ```
   Cognito → User pools → App clients → Your app client
   → Edit Hosted UI → Identity providers: check Auth0
   ```

4. **Set Feature Flag in Amplify**
   ```
   Amplify Console → App Settings → Environment Variables
   → Set REACT_APP_USE_EXTERNAL_IDP=true for both apps
   → Redeploy both apps
   ```

## 🔧 Step 5: Update Application URLs

### 5.1 Update Main App Environment Variables

In Amplify Console for main app:
```
REACT_APP_API_BASE_URL=https://abc123.execute-api.us-east-1.amazonaws.com/prod/api
REACT_APP_MAIN_APP_URL=https://main.d1234567890.amplifyapp.com
REACT_APP_ADMIN_APP_URL=https://admin.d9876543210.amplifyapp.com
```

### 5.2 Update Admin Portal Environment Variables

In Amplify Console for admin portal:
```
REACT_APP_API_BASE_URL=https://abc123.execute-api.us-east-1.amazonaws.com/prod/api
REACT_APP_MAIN_APP_URL=https://main.d1234567890.amplifyapp.com
REACT_APP_ADMIN_APP_URL=https://admin.d9876543210.amplifyapp.com
```

## 🧪 Step 6: Test Production Deployment

### 6.1 Test Main App

1. Visit: `https://main.d1234567890.amplifyapp.com`
2. You will see the **AuthSelection** screen with available sign-in options
3. Click **"Sign In with Cognito"** (native flow) or **"Sign In with SSO"** *(if `REACT_APP_USE_EXTERNAL_IDP=true`)*
4. Complete authentication in the Cognito Hosted UI
5. Verify user profile and dashboard display correctly

### 6.2 Test Admin Portal

1. Visit: `https://admin.d9876543210.amplifyapp.com`
2. If already authenticated via main app, Amplify session will be detected automatically (SSO)
3. If not authenticated, the **AuthSelection** screen is shown — sign in using the same method as main app
4. Users without `custom:role = admin` will see **Access Denied**
5. Admin users will see the full admin dashboard

### 6.3 Test API

```bash
# Test health endpoint
curl https://abc123.execute-api.us-east-1.amazonaws.com/prod/api/health

# Test with authentication (get token from app)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://abc123.execute-api.us-east-1.amazonaws.com/prod/api/protected/profile
```

## 🎨 Optional: Custom Domains

### For Amplify Apps

1. **Add Domain in Amplify Console**
   ```
   App Settings → Domain management → Add domain
   → Enter your domain: app.yourdomain.com
   → Configure DNS as instructed
   ```

### For API Gateway

1. **Create Custom Domain**
   ```
   API Gateway Console → Custom domain names
   → Create domain name
   → Configure Route 53 or your DNS provider
   ```

## 📊 Monitoring and Logs

### CloudWatch Logs

- **Amplify**: Automatic build and access logs
- **Lambda**: Function logs in CloudWatch
- **App Runner**: Application logs available

### Set Up Alarms

```
CloudWatch → Alarms → Create alarm
→ Select metrics for your services
→ Set thresholds for errors, latency, etc.
```

## 🔒 Production Security Checklist

- [ ] **HTTPS Everywhere**: All endpoints use SSL
- [ ] **Environment Variables**: No secrets in code
- [ ] **CORS Properly Configured**: Only production domains allowed  
- [ ] **Rate Limiting Active**: API has rate limits
- [ ] **JWT Validation**: Tokens properly validated
- [ ] **Error Handling**: No sensitive data in error messages
- [ ] **Monitoring**: CloudWatch alarms configured
- [ ] **Backup Strategy**: Data backup plan in place
- [ ] *(Phase 2)* **External IDP Configured**: Auth0 callback URLs use production Cognito domain
- [ ] *(Phase 2)* **Feature Flag Consistent**: `REACT_APP_USE_EXTERNAL_IDP` matches the same value in both Amplify apps

## 🔄 CI/CD Pipeline

### Automatic Deployments

Amplify automatically deploys when you push to your main branch. For API:

#### Lambda with GitHub Actions

Create `.github/workflows/deploy-api.yml`:
```yaml
name: Deploy API
on:
  push:
    branches: [main]
    paths: ['api-backend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    - name: Install Serverless
      run: npm install -g serverless
    - name: Install dependencies
      run: cd api-backend && npm install
    - name: Deploy
      run: cd api-backend && serverless deploy --stage prod
      env:
        AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## 🐛 Troubleshooting Deployment Issues

### Common Issues

#### 1. Build Failures

```
Error: Module not found
```
**Solution**: Check `package.json` dependencies and build paths

#### 2. CORS Errors in Production

```
Access blocked by CORS policy
```
**Solution**: Update `ALLOWED_ORIGINS` with exact production URLs

#### 3. Cognito Redirect Issues

```
Redirect URI mismatch
```
**Solution**: Update Cognito callback URLs with production domains

#### 4. API Authentication Fails

```
Invalid token issuer
```
**Solution**: Verify `COGNITO_USER_POOL_ID` and `COGNITO_REGION`

#### 5. SSO / External IDP Option Not Appearing

```
AuthSelection only shows native Cognito option
```
**Solution**: Verify `REACT_APP_USE_EXTERNAL_IDP=true` is set in Amplify Console environment variables and the app has been redeployed. Auth0 must also be configured as an Identity Provider in Cognito (Step 4.3).

#### 6. Auth0 Redirect Fails

```
Error: identity provider not found
```
**Solution**: Confirm the `identity_provider` value in `config.js` (`Auth0`) exactly matches the **Provider name** set in Cognito Federated Identity Provider settings.

### Debug Steps

1. **Check Environment Variables**: Verify all variables are set correctly
2. **Check CloudWatch Logs**: Look for specific error messages
3. **Test Endpoints**: Use curl to test API endpoints individually
4. **Verify Cognito Settings**: Check callback URLs and app client configuration

## 💰 Cost Optimization

### Free Tier Usage

- **Amplify**: 1000 build minutes, 15GB served per month
- **Lambda**: 1M requests, 400,000 GB-seconds per month
- **API Gateway**: 1M API calls per month
- **Cognito**: 50,000 MAUs (Monthly Active Users)

### Estimated Costs (Beyond Free Tier)

- **Small Scale** (< 1,000 users): $10-30/month
- **Medium Scale** (1,000-10,000 users): $50-150/month
- **Large Scale** (10,000+ users): $150+/month

## ✅ Deployment Complete!

Your Cognito SSO application is now live in production! 

**Final URLs:**
- Main App: `https://main.d1234567890.amplifyapp.com`
- Admin Portal: `https://admin.d9876543210.amplifyapp.com`  
- API: `https://abc123.execute-api.us-east-1.amazonaws.com/prod`

**Next Steps:**
1. Set up monitoring and alerting
2. Configure custom domains (optional)
3. Implement proper backup strategies
4. Monitor costs and usage
5. Plan for scaling as needed