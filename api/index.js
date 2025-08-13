const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
const authRoutes = require('../routes/auth');
const chatRoutes = require('../routes/chat_deepseek');
const userRoutes = require('../routes/users');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
      fontSrc: ['\'self\'', 'https://fonts.gstatic.com'],
      imgSrc: ['\'self\'', 'data:', 'https:'],
      scriptSrc: ['\'self\''],
      connectSrc: ['\'self\'', 'https://generativelanguage.googleapis.com']
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, 'https://*.vercel.app']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(globalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/users', userRoutes);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API Route not found',
    message: `The requested API route ${req.originalUrl} does not exist.`,
    availableRoutes: [
      'GET /health',
      'POST /auth/register',
      'POST /auth/login',
      'GET /auth/me',
      'POST /auth/refresh',
      'POST /auth/logout',
      'POST /chat/message',
      'GET /chat/sessions',
      'GET /chat/sessions/:id',
      'DELETE /chat/sessions/:id',
      'GET /chat/categories',
      'GET /users/profile',
      'PUT /users/profile',
      'POST /users/change-password',
      'GET /users/dashboard',
      'PUT /users/subscription',
      'GET /users/analytics',
      'GET /users/admin/users',
      'GET /users/admin/stats'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: errors
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      error: 'Duplicate Error',
      message: `${field} already exists`,
      field: field
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
  
  // Rate limit error
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests, please try again later'
    });
  }
  
  // Default error
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.name || 'Error',
    message: process.env.NODE_ENV === 'production' && status === 500 
      ? 'Something went wrong on our end. Please try again later.' 
      : message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database connection function
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jordan-lawbot';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false
    });
    
    console.log('✅ MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    // Don't exit in serverless environment
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
      process.exit(1);
    }
  }
};

// Connect to database when the function is invoked
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Export the Express app as a Vercel serverless function
module.exports = app;