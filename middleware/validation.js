const { body, param, query, validationResult } = require('express-validator');
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
 * Middleware to handle validation errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    logger.warn('Validation errors:', errorMessages);

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  
  next();
};

/**
 * User registration validation rules
 */
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
    
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  body('password')
    .isLength({ min: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8 })
    .withMessage(`Password must be at least ${process.env.PASSWORD_MIN_LENGTH || 8} characters long`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
    
  body('role')
    .isIn(['user', 'lawyer'])
    .withMessage('Role must be either user or lawyer'),
    
  body('licenseNumber')
    .if(body('role').equals('lawyer'))
    .notEmpty()
    .withMessage('License number is required for lawyers')
    .isLength({ min: 5, max: 20 })
    .withMessage('License number must be between 5 and 20 characters'),
    
  body('barAssociation')
    .if(body('role').equals('lawyer'))
    .notEmpty()
    .withMessage('Bar association is required for lawyers')
    .isLength({ min: 2, max: 100 })
    .withMessage('Bar association must be between 2 and 100 characters'),
    
  body('specialization')
    .if(body('role').equals('lawyer'))
    .optional()
    .isLength({ max: 200 })
    .withMessage('Specialization must not exceed 200 characters'),
    
  body('termsAccepted')
    .isBoolean()
    .custom((value) => {
      if (!value) {
        throw new Error('You must accept the terms and conditions');
      }
      return true;
    }),
    
  handleValidationErrors
];

/**
 * User login validation rules
 */
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
    
  handleValidationErrors
];

/**
 * Password reset request validation rules
 */
const validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  handleValidationErrors
];

/**
 * Password reset validation rules
 */
const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
    
  body('password')
    .isLength({ min: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8 })
    .withMessage(`Password must be at least ${process.env.PASSWORD_MIN_LENGTH || 8} characters long`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
    
  handleValidationErrors
];

/**
 * Chat message validation rules
 */
const validateChatMessage = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message must be between 1 and 5000 characters'),
    
  body('sessionId')
    .optional()
    .isMongoId()
    .withMessage('Invalid session ID format'),
    
  body('category')
    .optional()
    .isIn(['constitutional', 'civil', 'criminal', 'commercial', 'administrative', 'family', 'labor', 'other'])
    .withMessage('Invalid category'),
    
  handleValidationErrors
];

/**
 * Chat session validation rules
 */
const validateChatSession = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
    
  body('category')
    .optional()
    .isIn(['constitutional', 'civil', 'criminal', 'commercial', 'administrative', 'family', 'labor', 'other'])
    .withMessage('Invalid category'),
    
  handleValidationErrors
];

/**
 * User profile update validation rules
 */
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
    
  body('licenseNumber')
    .optional()
    .isLength({ min: 5, max: 20 })
    .withMessage('License number must be between 5 and 20 characters'),
    
  body('barAssociation')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Bar association must be between 2 and 100 characters'),
    
  body('specialization')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Specialization must not exceed 200 characters'),
    
  handleValidationErrors
];

/**
 * Password change validation rules
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
    
  body('newPassword')
    .isLength({ min: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8 })
    .withMessage(`New password must be at least ${process.env.PASSWORD_MIN_LENGTH || 8} characters long`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
  body('confirmNewPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
    
  handleValidationErrors
];

/**
 * MongoDB ObjectId validation
 */
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),
    
  handleValidationErrors
];

/**
 * Pagination validation rules
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  handleValidationErrors
];

/**
 * Session rating validation rules
 */
const validateSessionRating = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
    
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Feedback must not exceed 1000 characters'),
    
  handleValidationErrors
];

/**
 * File upload validation
 */
const validateFileUpload = [
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
    
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateChatMessage,
  validateChatSession,
  validateProfileUpdate,
  validatePasswordChange,
  validateObjectId,
  validatePagination,
  validateSessionRating,
  validateFileUpload
};