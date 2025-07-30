const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const app = express();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chat');
const documentRoutes = require('./routes/documents');
const adminRoutes = require('./routes/admin');
const { router: notificationRoutes } = require('./routes/notifications');
const subscriptionRoutes = require('./routes/subscription');
const searchRoutes = require('./routes/search');

let mongod;

// Start MongoDB Memory Server and connect
const startServer = async () => {
  try {
    console.log('🚀 Starting MongoDB Memory Server...');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    console.log('📦 Memory MongoDB URI:', uri);
    
    // Connect to the in-memory database
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB Memory Server');
    
    // Import legal documents after connection
    console.log('📚 Importing legal documents...');
    await importLegalDocuments();
    
  } catch (error) {
    console.error('❌ MongoDB Memory Server error:', error);
    process.exit(1);
  }
};

// Import legal documents function
const importLegalDocuments = async () => {
  try {
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const importProcess = spawn('node', ['import_uploaded_docs.js'], {
        stdio: 'inherit',
        env: { ...process.env, MONGODB_URI: mongoose.connection.client.s.url }
      });
      
      importProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Legal documents imported successfully');
          resolve();
        } else {
          console.log('⚠️ Import process finished with code:', code);
          resolve(); // Continue even if import fails
        }
      });
      
      importProcess.on('error', (error) => {
        console.log('⚠️ Import error:', error.message);
        resolve(); // Continue even if import fails
      });
    });
  } catch (error) {
    console.log('⚠️ Could not import documents:', error.message);
  }
};

// Global rate limiting
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.stripe.com', 'https://generativelanguage.googleapis.com']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'https://lawbot-frontend.vercel.app',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    console.log('CORS check - Origin:', origin, 'Allowed:', allowedOrigins);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('CORS blocked origin:', origin);
      // For development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply global rate limiting
app.use(globalRateLimit);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'LawBot API is running with Memory Database',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: 'MongoDB Memory Server'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/search', searchRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'LawBot API v1.0 - Memory Database Mode',
    database: 'MongoDB Memory Server',
    note: 'This is running with an in-memory database for development/testing'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  // Default error response
  const statusCode = error.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  if (mongod) {
    await mongod.stop();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  if (mongod) {
    await mongod.stop();
  }
  process.exit(0);
});

// Start the server
startServer().then(() => {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 LawBot API Server running on port ${PORT}`);
    console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📖 API docs: http://localhost:${PORT}/api`);
    console.log(`💾 Database: MongoDB Memory Server`);
    console.log(`⚡ Ready to serve legal consultations!\n`);
  });
});

module.exports = app;