const express = require('express');
const router = express.Router();

/**
 * Public routes (no authentication required)
 */

// Health check
router.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    memory: process.memoryUsage(),
    services: {
      database: 'OK',
      authentication: 'OK',
      external_apis: 'OK'
    }
  };

  res.json(healthCheck);
});

// API information
router.get('/info', (req, res) => {
  res.json({
    name: 'Cognito SSO API',
    version: '1.0.0',
    description: 'REST API with AWS Cognito JWT authentication',
    endpoints: {
      public: [
        'GET /api/health',
        'GET /api/info',
        'GET /api/docs'
      ],
      protected: [
        'GET /api/protected/profile',
        'GET /api/protected/permissions',
        'PUT /api/protected/profile',
        'GET /api/protected/activity',
        'GET /api/protected/test'
      ],
      admin: [
        'GET /api/admin/stats',
        'GET /api/admin/users',
        'GET /api/admin/logs',
        'PUT /api/admin/users/:id/role',
        'POST /api/admin/maintenance'
      ]
    },
    authentication: {
      type: 'Bearer JWT',
      provider: 'AWS Cognito',
      header: 'Authorization: Bearer <token>'
    },
    documentation: '/docs',
    timestamp: new Date().toISOString()
  });
});

// API Documentation
router.get('/docs', (req, res) => {
  const docs = {
    title: 'Cognito SSO API Documentation',
    version: '1.0.0',
    description: 'This API demonstrates AWS Cognito JWT authentication with role-based access control.',
    
    authentication: {
      description: 'All protected endpoints require a valid JWT token from AWS Cognito',
      type: 'Bearer Token',
      header: 'Authorization: Bearer <your-jwt-token>',
      obtain_token: 'Sign in through the web application to obtain a JWT token'
    },

    endpoints: {
      public: {
        'GET /api/health': {
          description: 'Health check endpoint',
          authentication: 'None',
          response: 'System health information'
        },
        'GET /api/info': {
          description: 'API information and available endpoints',
          authentication: 'None',
          response: 'API metadata and endpoint list'
        },
        'GET /api/docs': {
          description: 'This documentation',
          authentication: 'None',
          response: 'API documentation'
        }
      },

      protected: {
        'GET /api/protected/profile': {
          description: 'Get current user profile',
          authentication: 'Required',
          roles: 'Any authenticated user',
          response: 'User profile information'
        },
        'GET /api/protected/permissions': {
          description: 'Get user permissions based on role',
          authentication: 'Required',
          roles: 'Any authenticated user',
          response: 'List of user permissions'
        },
        'PUT /api/protected/profile': {
          description: 'Update user profile',
          authentication: 'Required',
          roles: 'Any authenticated user',
          body: '{ "name": "string", "department": "string" }',
          response: 'Updated profile information'
        },
        'GET /api/protected/activity': {
          description: 'Get user activity log',
          authentication: 'Required',
          roles: 'Any authenticated user',
          response: 'User activity history'
        },
        'GET /api/protected/test': {
          description: 'Test authentication',
          authentication: 'Required',
          roles: 'Any authenticated user',
          response: 'Authentication confirmation'
        }
      },

      admin: {
        'GET /api/admin/stats': {
          description: 'Get system statistics',
          authentication: 'Required',
          roles: 'admin, super-admin',
          response: 'System metrics and statistics'
        },
        'GET /api/admin/users': {
          description: 'Get all users (paginated)',
          authentication: 'Required',
          roles: 'admin, super-admin',
          parameters: '?page=1&limit=10',
          response: 'List of users with pagination'
        },
        'GET /api/admin/logs': {
          description: 'Get system logs',
          authentication: 'Required',
          roles: 'admin, super-admin',
          parameters: '?level=info&limit=50',
          response: 'System log entries'
        },
        'PUT /api/admin/users/:userId/role': {
          description: 'Update user role',
          authentication: 'Required',
          roles: 'super-admin only',
          body: '{ "role": "user|admin|super-admin" }',
          response: 'Role update confirmation'
        },
        'POST /api/admin/maintenance': {
          description: 'Control maintenance mode',
          authentication: 'Required',
          roles: 'admin, super-admin',
          body: '{ "action": "start|stop", "duration": "optional" }',
          response: 'Maintenance mode status'
        }
      }
    },

    roles: {
      user: {
        description: 'Regular user with basic permissions',
        permissions: ['read:profile', 'update:profile']
      },
      admin: {
        description: 'Administrator with elevated permissions',
        permissions: ['read:profile', 'update:profile', 'read:users', 'manage:users', 'read:system']
      },
      'super-admin': {
        description: 'Super administrator with all permissions',
        permissions: ['*']
      }
    },

    error_responses: {
      '401': 'Unauthorized - Missing or invalid token',
      '403': 'Forbidden - Insufficient permissions',
      '404': 'Not Found - Endpoint does not exist',
      '429': 'Too Many Requests - Rate limit exceeded',
      '500': 'Internal Server Error - Server error'
    },

    examples: {
      curl_authenticated_request: `curl -X GET \\
  ${req.protocol}://${req.get('host')}/api/protected/profile \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \\
  -H "Content-Type: application/json"`,
      
      javascript_request: `fetch('${req.protocol}://${req.get('host')}/api/protected/profile', {
  headers: {
    'Authorization': 'Bearer ' + your_jwt_token,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));`
    }
  };

  res.json(docs);
});

// CORS preflight for all routes
router.options('*', (req, res) => {
  res.sendStatus(200);
});

module.exports = router;