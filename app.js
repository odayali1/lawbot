const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const compression = require('compression')
const path = require('path')
require('dotenv').config()

const app = express()

// Import routes
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')
const chatRoutes = require('./routes/chat_deepseek') // Using Gemini instead of OpenAI
const documentRoutes = require('./routes/documents')
const adminRoutes = require('./routes/admin')
const { router: notificationRoutes } = require('./routes/notifications')
const subscriptionRoutes = require('./routes/subscription')
const searchRoutes = require('./routes/search')
const systemInstructionRoutes = require('./routes/systemInstructions')

// Database connection with serverless-friendly approach
let isConnected = false

const connectToDatabase = async () => {
  if (isConnected) {
    return Promise.resolve()
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lawbot', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0, // Disable mongoose buffering
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    })
    
    isConnected = true
    console.log('Connected to MongoDB')
  } catch (error) {
    console.error('MongoDB connection error:', error)
    // In serverless, don't exit - just continue without DB for health checks
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1)
    }
  }
}

// Initialize DB connection for non-serverless environments
if (require.main === module) {
  connectToDatabase()
}

// Trust proxy for rate limiting
app.set('trust proxy', 1)

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
})

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
      fontSrc: ['\'self\'', 'https://fonts.gstatic.com'],
      scriptSrc: ['\'self\''],
      imgSrc: ['\'self\'', 'data:', 'https:'],
      connectSrc: ['\'self\'', 'https://api.stripe.com', 'https://generativelanguage.googleapis.com']
    }
  },
  crossOriginEmbedderPolicy: false
}))

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://192.168.1.2:3000',
      'https://lawbot-frontend.vercel.app',
      process.env.FRONTEND_URL
    ].filter(Boolean)
    
    console.log('CORS check - Origin:', origin, 'Allowed:', allowedOrigins)
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      console.warn('CORS blocked origin:', origin)
      // For development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}

app.use(cors(corsOptions))

// Compression middleware
app.use(compression())

// Logging middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'))
} else {
  app.use(morgan('dev'))
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Apply global rate limiting
app.use(globalRateLimit)

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Health check endpoints (no DB required) - MUST come before any middleware
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development', timestamp: new Date().toISOString() })
})

// API routes with conditional DB connection
app.use('/api', async (req, res, next) => {
  // Skip DB connection for health endpoint
  if (req.path === '/health') {
    res.json({ status: 'ok', env: process.env.NODE_ENV || 'development', timestamp: new Date().toISOString() })
    return
  }
  
  // Ensure DB is connected in serverless environments before proceeding
  try {
    await connectToDatabase()
    next()
  } catch (error) {
    console.error('Database connection failed:', error)
    res.status(500).json({ 
      success: false,
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/subscription', subscriptionRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/system-instructions', systemInstructionRoutes)

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'LawBot API v1.0',
    documentation: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout'
      },
      users: {
        profile: 'GET /api/users/profile',
        updateProfile: 'PUT /api/users/profile',
        changePassword: 'PUT /api/users/password',
        dashboard: 'GET /api/users/dashboard',
        subscription: 'POST /api/users/subscription',
        analytics: 'GET /api/users/analytics'
      },
      chat: {
        sendMessage: 'POST /api/chat/message',
        getSessions: 'GET /api/chat/sessions',
        getSession: 'GET /api/chat/sessions/:id',
        deleteSession: 'DELETE /api/chat/sessions/:id',
        getCategories: 'GET /api/chat/categories'
      },
      documents: {
        search: 'GET /api/documents/search',
        getDocument: 'GET /api/documents/:id',
        getArticle: 'GET /api/documents/:id/articles/:articleNumber',
        getCategories: 'GET /api/documents/meta/categories',
        create: 'POST /api/documents (Admin)',
        upload: 'POST /api/documents/upload (Admin)',
        update: 'PUT /api/documents/:id (Admin)',
        delete: 'DELETE /api/documents/:id (Admin)'
      },
      search: {
        documents: 'GET /api/search/documents',
        advanced: 'GET /api/search/advanced',
        suggestions: 'GET /api/search/suggestions',
        similar: 'GET /api/search/similar/:documentId',
        popular: 'GET /api/search/popular',
        feedback: 'POST /api/search/feedback',
        history: 'GET /api/search/history'
      },
      subscription: {
        plans: 'GET /api/subscription/plans',
        current: 'GET /api/subscription/current',
        createPaymentIntent: 'POST /api/subscription/create-payment-intent',
        confirmPayment: 'POST /api/subscription/confirm-payment',
        upgrade: 'POST /api/subscription/upgrade',
        downgrade: 'POST /api/subscription/downgrade',
        cancel: 'POST /api/subscription/cancel',
        reactivate: 'POST /api/subscription/reactivate',
        paymentHistory: 'GET /api/subscription/payment-history',
        usage: 'GET /api/subscription/usage'
      },
      notifications: {
        getNotifications: 'GET /api/notifications',
        markAsRead: 'PUT /api/notifications/:id/read',
        markAllAsRead: 'PUT /api/notifications/read-all',
        deleteNotification: 'DELETE /api/notifications/:id',
        getPreferences: 'GET /api/notifications/preferences',
        updatePreferences: 'PUT /api/notifications/preferences',
        send: 'POST /api/notifications/send (Admin)',
        broadcast: 'POST /api/notifications/broadcast (Admin)'
      },
      admin: {
        dashboard: 'GET /api/admin/dashboard',
        users: 'GET /api/admin/users',
        getUser: 'GET /api/admin/users/:id',
        createUser: 'POST /api/admin/users',
        updateUser: 'PUT /api/admin/users/:id',
        deleteUser: 'DELETE /api/admin/users/:id',
        sessions: 'GET /api/admin/sessions',
        analytics: 'GET /api/admin/analytics',
        systemHealth: 'GET /api/admin/system/health',
        backup: 'POST /api/admin/system/backup'
      }
    },
    features: [
      'User Authentication & Authorization',
      'Legal Document Search & Retrieval',
      'AI-Powered Legal Consultation',
      'Subscription Management',
      'Real-time Notifications',
      'Advanced Search & Filtering',
      'Admin Dashboard & Analytics',
      'Document Upload & Processing',
      'User Session Management',
      'Payment Processing (Stripe)',
      'Rate Limiting & Security',
      'Comprehensive API Documentation'
    ]
  })
})

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  })
})

// Serve static files from the React app (if present)
const buildPath = path.join(__dirname, 'client', 'build')
app.use(express.static(buildPath))

// The "catchall" handler: for any request that doesn't match any API route, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'))
})

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error)
  
  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }))
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    })
  }
  
  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0]
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
      field
    })
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    })
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    })
  }
  
  // CORS errors
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    })
  }
  
  // Default error response
  const statusCode = error.statusCode || 500
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  })
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err)
  // Close server & exit process (if running as a standalone server)
  if (typeof server !== 'undefined' && server && server.close) {
    server.close(() => {
      process.exit(1)
    })
  }
})

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
  // In serverless, there is no long-lived server to close
  if (typeof server !== 'undefined' && server && server.close) {
    server.close(() => process.exit(1))
  } else {
    process.exit(1)
  }
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...')
  if (typeof server !== 'undefined' && server && server.close) {
    server.close(() => {
      console.log('Process terminated')
      mongoose.connection.close()
    })
  }
})

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...')
  if (typeof server !== 'undefined' && server && server.close) {
    server.close(() => {
      console.log('Process terminated')
      mongoose.connection.close()
    })
  }
})

// Start server only when running this file directly (not when required by serverless)
let server
if (require.main === module) {
  const PORT = process.env.PORT || 5000
  server = app.listen(PORT, () => {
    console.log(`\n🚀 LawBot API Server running on port ${PORT}`)
    console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`🔗 Health check: http://localhost:${PORT}/health`)
    console.log(`📖 API docs: http://localhost:${PORT}/api`)
    console.log('⚡ Ready to serve legal consultations!\n')
  })
}

module.exports = app
