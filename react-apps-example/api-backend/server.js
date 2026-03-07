require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import middleware and routes
const JWTValidator = require('./middleware/auth');
const publicRoutes = require('./routes/public');
const protectedRoutes = require('./routes/protected');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize JWT validator
const jwtValidator = new JWTValidator();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:3001'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy if behind reverse proxy (for production)
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Routes

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Cognito SSO API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    documentation: '/api/docs',
    health: '/api/health'
  });
});

// Public routes (no authentication required)
app.use('/api', publicRoutes);

// Protected routes (authentication required)
app.use('/api/protected', jwtValidator.authenticate, protectedRoutes);

// Admin routes (authentication + admin role required)
app.use('/api/admin', jwtValidator.authenticate, jwtValidator.requireAdmin, adminRoutes);

// Handle 404 errors
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.baseUrl} not found`,
    availableEndpoints: {
      public: [
        'GET /api/health',
        'GET /api/info', 
        'GET /api/docs'
      ],
      protected: [
        'GET /api/protected/profile',
        'GET /api/protected/test'
      ],
      admin: [
        'GET /api/admin/stats',
        'GET /api/admin/users'
      ]
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed',
      origin: req.get('Origin')
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Authentication Error', 
      message: 'Token expired'
    });
  }

  // Default error
  const status = err.status || 500;
  res.status(status).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('🚀 Cognito SSO API Server started');
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 User Pool ID: ${process.env.COGNITO_USER_POOL_ID || 'Not configured'}`);
  console.log(`🌍 CORS origins: ${allowedOrigins.join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;