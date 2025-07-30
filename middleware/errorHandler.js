const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

/**
 * Custom error class for application errors
 */
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle Mongoose validation errors
 * @param {Error} err - Mongoose validation error
 * @returns {AppError} Formatted error
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose duplicate key errors
 * @param {Error} err - Mongoose duplicate key error
 * @returns {AppError} Formatted error
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose cast errors
 * @param {Error} err - Mongoose cast error
 * @returns {AppError} Formatted error
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Handle JWT errors
 * @param {Error} err - JWT error
 * @returns {AppError} Formatted error
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again!', 401);
};

/**
 * Handle JWT expired errors
 * @param {Error} err - JWT expired error
 * @returns {AppError} Formatted error
 */
const handleJWTExpiredError = () => {
  return new AppError('Your token has expired! Please log in again.', 401);
};

/**
 * Handle rate limit errors
 * @param {Error} err - Rate limit error
 * @returns {AppError} Formatted error
 */
const handleRateLimitError = () => {
  return new AppError('Too many requests from this IP, please try again later.', 429);
};

/**
 * Handle file upload errors
 * @param {Error} err - File upload error
 * @returns {AppError} Formatted error
 */
const handleFileUploadError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File too large. Maximum size allowed is 10MB.', 400);
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return new AppError('Too many files. Maximum 5 files allowed.', 400);
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Unexpected file field.', 400);
  }
  return new AppError('File upload failed.', 400);
};

/**
 * Send error response in development
 * @param {Error} err - Error object
 * @param {Object} res - Express response object
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

/**
 * Send error response in production
 * @param {Error} err - Error object
 * @param {Object} res - Express response object
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR:', err);
    
    res.status(500).json({
      success: false,
      message: 'Something went wrong!'
    });
  }
};

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user._id : 'anonymous'
  });

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error.type === 'entity.too.large') error = new AppError('Request entity too large', 413);
    if (error.code && error.code.startsWith('LIMIT_')) error = handleFileUploadError(error);
    if (err.message && err.message.includes('rate limit')) error = handleRateLimitError();

    sendErrorProd(error, res);
  }
};

/**
 * Handle 404 errors for undefined routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFoundHandler = (req, res, next) => {
  const message = `Can't find ${req.originalUrl} on this server!`;
  const availableRoutes = [
    'GET /api/health',
    'POST /api/auth/register',
    'POST /api/auth/login',
    'POST /api/auth/logout',
    'POST /api/auth/refresh-token',
    'POST /api/auth/forgot-password',
    'POST /api/auth/reset-password',
    'GET /api/auth/verify-email/:token',
    'GET /api/users/profile',
    'PUT /api/users/profile',
    'PUT /api/users/change-password',
    'DELETE /api/users/account',
    'GET /api/users/analytics',
    'POST /api/chat/message',
    'GET /api/chat/sessions',
    'POST /api/chat/sessions',
    'GET /api/chat/sessions/:id',
    'PUT /api/chat/sessions/:id',
    'DELETE /api/chat/sessions/:id',
    'POST /api/chat/sessions/:id/rate',
    'POST /api/chat/upload'
  ];

  logger.warn(`404 Error: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user._id : 'anonymous'
  });

  res.status(404).json({
    success: false,
    message,
    availableRoutes: process.env.NODE_ENV === 'development' ? availableRoutes : undefined
  });
};

/**
 * Async error wrapper to catch async errors
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', err);
  process.exit(1);
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', err);
  process.exit(1);
});

module.exports = {
  AppError,
  globalErrorHandler,
  notFoundHandler,
  catchAsync,
  logger
};