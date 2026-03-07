const express = require('express');
const router = express.Router();

/**
 * Admin-only routes
 */

// Get system statistics
router.get('/stats', (req, res) => {
  try {
    // Mock system statistics
    const stats = {
      users: {
        total: Math.floor(Math.random() * 1000) + 500,
        active: Math.floor(Math.random() * 800) + 400,
        new_today: Math.floor(Math.random() * 20) + 5
      },
      api: {
        total_requests: Math.floor(Math.random() * 50000) + 20000,
        requests_today: Math.floor(Math.random() * 5000) + 2000,
        avg_response_time: Math.floor(Math.random() * 200) + 150,
        error_rate: (Math.random() * 0.05).toFixed(3)
      },
      system: {
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        cpu_usage: Math.random() * 100,
        disk_usage: Math.random() * 100
      },
      security: {
        failed_logins_today: Math.floor(Math.random() * 10),
        blocked_ips: Math.floor(Math.random() * 5),
        suspicious_activities: Math.floor(Math.random() * 3)
      }
    };

    res.json({
      success: true,
      stats,
      generated_by: {
        admin: req.user.email,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve system statistics'
    });
  }
});

// Get all users (admin only)
router.get('/users', (req, res) => {
  try {
    // Mock user data
    const users = [
      {
        id: '1',
        email: 'admin@example.com',
        username: 'admin_user',
        role: 'admin',
        status: 'active',
        last_login: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()
      },
      {
        id: '2',
        email: 'user1@example.com',
        username: 'user1',
        role: 'user',
        status: 'active',
        last_login: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString()
      },
      {
        id: '3',
        email: 'user2@example.com',
        username: 'user2',
        role: 'user',
        status: 'active',
        last_login: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString()
      },
      {
        id: req.user.sub,
        email: req.user.email,
        username: req.user.username,
        role: req.user.role,
        status: 'active',
        last_login: 'Currently online',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString()
      }
    ];

    const { page = 1, limit = 10 } = req.query;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = users.slice(startIndex, endIndex);

    res.json({
      success: true,
      users: paginatedUsers,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: users.length,
        total_pages: Math.ceil(users.length / limit)
      },
      requested_by: {
        admin: req.user.email,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve users'
    });
  }
});

// Get system logs
router.get('/logs', (req, res) => {
  try {
    const { level = 'all', limit = 50 } = req.query;
    
    // Mock log data
    const logs = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 1000 * 60).toISOString(),
        level: 'info',
        message: `Admin ${req.user.email} accessed system logs`,
        source: 'api',
        user_id: req.user.sub
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        level: 'info',
        message: 'User authentication successful',
        source: 'auth',
        user_id: 'user123'
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        level: 'warn',
        message: 'Rate limit exceeded for IP 192.168.1.100',
        source: 'security',
        ip: '192.168.1.100'
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        level: 'error',
        message: 'Database connection timeout',
        source: 'database',
        error: 'Connection timeout after 30s'
      },
      {
        id: '5',
        timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        level: 'info',
        message: 'System backup completed successfully',
        source: 'backup',
        size: '2.3GB'
      }
    ];

    // Filter by log level if specified
    const filteredLogs = level === 'all' ? logs : logs.filter(log => log.level === level);
    const limitedLogs = filteredLogs.slice(0, parseInt(limit));

    res.json({
      success: true,
      logs: limitedLogs,
      filters: {
        level,
        limit: parseInt(limit)
      },
      total: filteredLogs.length,
      requested_by: {
        admin: req.user.email,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve logs'
    });
  }
});

// Update user role (super admin only)
router.put('/users/:userId/role', (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Check if current user is super admin
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Super admin privileges required for role changes'
      });
    }

    if (!role || !['user', 'admin', 'super-admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be one of: user, admin, super-admin'
      });
    }

    // In a real app, you would update the user in Cognito
    res.json({
      success: true,
      message: `User role updated to ${role}`,
      user: {
        id: userId,
        new_role: role
      },
      updated_by: {
        admin: req.user.email,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update user role'
    });
  }
});

// System maintenance endpoint
router.post('/maintenance', (req, res) => {
  try {
    const { action, duration } = req.body;

    if (!['start', 'stop'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action',
        message: 'Action must be either "start" or "stop"'
      });
    }

    res.json({
      success: true,
      message: `Maintenance mode ${action}ed`,
      maintenance: {
        action,
        duration: duration || 'undefined',
        scheduled_by: req.user.email,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error handling maintenance:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update maintenance mode'
    });
  }
});

module.exports = router;