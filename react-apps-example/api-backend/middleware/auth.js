const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Validates AWS Cognito JWT tokens
 */

class JWTValidator {
  constructor() {
    this.userPoolId = process.env.COGNITO_USER_POOL_ID;
    this.region = process.env.COGNITO_REGION || 'us-east-1';
    this.appClientId = process.env.COGNITO_APP_CLIENT_ID;
    this.jwksClient = null; // Will be initialized lazily
    
    if (!this.userPoolId) {
      throw new Error('COGNITO_USER_POOL_ID environment variable is required');
    }
  }

  async getJwksClient() {
    if (!this.jwksClient) {
      const jwksClientModule = await import('jwks-client');
      this.jwksClient = jwksClientModule.default({
        jwksUri: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}/.well-known/jwks.json`,
        cache: true,
        cacheMaxAge: 86400000, // 24 hours
        cacheMaxEntries: 5,
        timeout: 30000
      });
      console.log(`JWT Validator initialized for User Pool: ${this.userPoolId}`);
    }
    return this.jwksClient;
  }

  /**
   * Get signing key for JWT verification
   */
  getKey = async (header, callback) => {
    try {
      const client = await this.getJwksClient();
      client.getSigningKey(header.kid, (err, key) => {
        if (err) {
          console.error('Error getting signing key:', err);
          return callback(err);
        }
        
        const signingKey = key.publicKey || key.rsaPublicKey;
        callback(null, signingKey);
      });
    } catch (error) {
      console.error('Error in getKey:', error);
      callback(error);
    }
  };

  /**
   * Extract token from Authorization header
   */
  extractToken(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Validate JWT token
   */
  async validateToken(token) {
    return new Promise((resolve, reject) => {
      // Verify token signature and claims
      jwt.verify(
        token,
        this.getKey,
        {
          audience: this.appClientId,
          issuer: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`,
          algorithms: ['RS256']
        },
        (err, decoded) => {
          if (err) {
            console.error('Token validation error:', err.message);
            return reject(err);
          }

          // Additional validations
          const currentTime = Math.floor(Date.now() / 1000);
          
          if (decoded.exp <= currentTime) {
            return reject(new Error('Token has expired'));
          }

          if (decoded.token_use !== 'access') {
            return reject(new Error('Invalid token use'));
          }

          resolve(decoded);
        }
      );
    });
  }

  /**
   * Express middleware for JWT authentication
   */
  authenticate = async (req, res, next) => {
    try {
      const token = this.extractToken(req.headers.authorization);
      
      if (!token) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'No valid Bearer token provided'
        });
      }

      // Validate the token
      const decoded = await this.validateToken(token);
      
      // Add user information to request
      req.user = {
        sub: decoded.sub,
        username: decoded.username,
        email: decoded.email,
        scope: decoded.scope,
        tokenUse: decoded.token_use,
        clientId: decoded.client_id,
        iss: decoded.iss,
        exp: decoded.exp,
        iat: decoded.iat,
        // Add any custom attributes
        role: decoded['custom:role'] || null,
        department: decoded['custom:department'] || null
      };

      // Log successful authentication
      console.log(`Authenticated user: ${req.user.email || req.user.username} (${req.user.sub})`);
      
      next();
    } catch (error) {
      console.error('Authentication error:', error.message);
      
      let statusCode = 401;
      let errorMessage = 'Invalid token';

      if (error.name === 'TokenExpiredError') {
        errorMessage = 'Token has expired';
      } else if (error.name === 'JsonWebTokenError') {
        errorMessage = 'Invalid token format';
      } else if (error.message.includes('audience')) {
        errorMessage = 'Invalid token audience';
      } else if (error.message.includes('issuer')) {
        errorMessage = 'Invalid token issuer';
      }

      res.status(statusCode).json({
        error: 'Authentication failed',
        message: errorMessage
      });
    }
  };

  /**
   * Middleware to check for admin role
   */
  requireAdmin = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No user information found'
      });
    }

    const userRole = req.user.role;
    const adminRoles = ['admin', 'super-admin', 'administrator'];
    
    if (!adminRoles.some(role => role.toLowerCase() === userRole?.toLowerCase())) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Administrative privileges required',
        userRole: userRole || 'none'
      });
    }

    console.log(`Admin access granted to: ${req.user.email || req.user.username} (role: ${userRole})`);
    next();
  };

  /**
   * Middleware to check for specific roles
   */
  requireRole = (allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'No user information found'
        });
      }

      const userRole = req.user.role;
      
      if (!allowedRoles.some(role => role.toLowerCase() === userRole?.toLowerCase())) {
        return res.status(403).json({
          error: 'Access denied',
          message: `Required roles: ${allowedRoles.join(', ')}`,
          userRole: userRole || 'none'
        });
      }

      next();
    };
  };

  /**
   * Optional authentication middleware (doesn't fail if no token)
   */
  optionalAuth = async (req, res, next) => {
    try {
      const token = this.extractToken(req.headers.authorization);
      
      if (token) {
        const decoded = await this.validateToken(token);
        req.user = {
          sub: decoded.sub,
          username: decoded.username,
          email: decoded.email,
          scope: decoded.scope,
          role: decoded['custom:role'] || null
        };
      }
    } catch (error) {
      // Log but don't fail - this is optional auth
      console.log('Optional auth failed:', error.message);
    }
    
    next();
  };
}

module.exports = JWTValidator;