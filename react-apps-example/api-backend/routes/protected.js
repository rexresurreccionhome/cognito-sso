const express = require('express');
const router = express.Router();

/**
 * Protected routes that require authentication
 */

// Get user profile
router.get('/profile', (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.sub,
        email: req.user.email,
        username: req.user.username,
        role: req.user.role,
        department: req.user.department,
        tokenInfo: {
          clientId: req.user.clientId,
          scope: req.user.scope,
          issuedAt: new Date(req.user.iat * 1000).toISOString(),
          expiresAt: new Date(req.user.exp * 1000).toISOString()
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve user profile'
    });
  }
});

// Get user permissions
router.get('/permissions', (req, res) => {
  try {
    const userRole = req.user.role || 'user';
    const permissions = {
      user: ['read:profile', 'update:profile'],
      admin: ['read:profile', 'update:profile', 'read:users', 'manage:users', 'read:system'],
      'super-admin': ['*']
    };

    const userPermissions = permissions[userRole] || permissions.user;

    res.json({
      success: true,
      user: {
        id: req.user.sub,
        email: req.user.email,
        role: userRole
      },
      permissions: userPermissions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting user permissions:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve permissions'
    });
  }
});

// Update user profile (limited fields)
router.put('/profile', (req, res) => {
  try {
    const { name, department } = req.body;
    
    // In a real app, you would update the user in Cognito or your database
    // For this demo, we'll just return the updated info
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: req.user.sub,
        email: req.user.email,
        username: req.user.username,
        name: name || req.user.name,
        department: department || req.user.department,
        role: req.user.role
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update profile'
    });
  }
});

// Get user activity
router.get('/activity', (req, res) => {
  try {
    // Mock activity data
    const activities = [
      {
        id: '1',
        action: 'login',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      {
        id: '2',
        action: 'profile_view',
        timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        ip: req.ip
      },
      {
        id: '3',
        action: 'api_access',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        endpoint: '/api/protected/permissions'
      }
    ];

    res.json({
      success: true,
      user: {
        id: req.user.sub,
        email: req.user.email
      },
      activities,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting user activity:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve activity'
    });
  }
});

// Test endpoint for checking authentication
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Authentication successful! You can access protected endpoints.',
    user: {
      id: req.user.sub,
      email: req.user.email,
      role: req.user.role
    },
    server: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

module.exports = router;