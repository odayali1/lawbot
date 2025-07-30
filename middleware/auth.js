const jwt = require('jsonwebtoken');
const User = require('../models/User');
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
    })
  ]
});

/**
 * Middleware to authenticate JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Middleware to check if user is admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

/**
 * Middleware to check if user is lawyer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireLawyer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'lawyer' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Lawyer access required'
    });
  }

  next();
};

/**
 * Middleware to check subscription limits
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const checkSubscriptionLimits = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = req.user;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Reset monthly usage if it's a new month
    if (user.subscription.lastResetDate.getMonth() !== currentMonth || 
        user.subscription.lastResetDate.getFullYear() !== currentYear) {
      user.subscription.monthlyUsage = 0;
      user.subscription.lastResetDate = currentDate;
      await user.save();
    }

    // Check if user has exceeded monthly limit
    const limits = {
      basic: parseInt(process.env.BASIC_PLAN_QUERIES) || 50,
      pro: parseInt(process.env.PRO_PLAN_QUERIES) || 200,
      enterprise: parseInt(process.env.ENTERPRISE_PLAN_QUERIES) || 1000
    };

    const userLimit = limits[user.subscription.plan] || limits.basic;

    if (user.subscription.monthlyUsage >= userLimit) {
      return res.status(429).json({
        success: false,
        message: 'Monthly query limit exceeded',
        data: {
          currentUsage: user.subscription.monthlyUsage,
          limit: userLimit,
          plan: user.subscription.plan
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Subscription check error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to check subscription limits'
    });
  }
};

/**
 * Middleware to increment usage count
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const incrementUsage = async (req, res, next) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(
        req.user._id,
        { 
          $inc: { 'subscription.monthlyUsage': 1 },
          $set: { 'lastActivity': new Date() }
        }
      );
    }
    next();
  } catch (error) {
    logger.error('Usage increment error:', error.message);
    // Don't block the request if usage increment fails
    next();
  }
};

/**
 * Optional authentication middleware (doesn't require token)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

/**
 * Middleware to validate refresh token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Refresh token validation error:', error.message);
    
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireLawyer,
  checkSubscriptionLimits,
  incrementUsage,
  optionalAuth,
  validateRefreshToken
};