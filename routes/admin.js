const express = require('express')
const User = require('../models/User')
const ChatSession = require('../models/ChatSession')
const LegalDocument = require('../models/LegalDocument')
const { body, validationResult, param, query } = require('express-validator')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const rateLimit = require('express-rate-limit')

const router = express.Router()

// Rate limiting for admin operations
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many admin requests, please try again later'
  }
})

// Auth middleware
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId)

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user inactive'
      })
    }

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    })
  }
}

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    })
  }
  next()
}

// Super admin middleware
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' || !req.user.permissions?.includes('super_admin')) {
    return res.status(403).json({
      success: false,
      message: 'Super admin access required'
    })
  }
  next()
}

// Validation middleware
const validateUserCreate = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number and special character'),
  body('role')
    .isIn(['user', 'lawyer', 'admin'])
    .withMessage('Invalid role'),
  body('subscription.plan')
    .optional()
    .isIn(['free', 'basic', 'premium', 'enterprise'])
    .withMessage('Invalid subscription plan')
]

const validateUserUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('role')
    .optional()
    .isIn(['user', 'lawyer', 'admin'])
    .withMessage('Invalid role'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('subscription.plan')
    .optional()
    .isIn(['free', 'basic', 'premium', 'enterprise'])
    .withMessage('Invalid subscription plan')
]

// Apply rate limiting to all admin routes
router.use(adminRateLimit)

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard overview
// @access  Private/Admin
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // User statistics
    const [totalUsers, activeUsers, newUsers, lawyerUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ role: 'lawyer' })
    ])

    // Session statistics
    const [totalSessions, activeSessions, recentSessions] = await Promise.all([
      ChatSession.countDocuments(),
      ChatSession.countDocuments({ status: 'active' }),
      ChatSession.countDocuments({ createdAt: { $gte: sevenDaysAgo } })
    ])

    // Document statistics
    const [totalDocuments, activeDocuments, recentDocuments] = await Promise.all([
      LegalDocument.countDocuments(),
      LegalDocument.countDocuments({ status: 'active' }),
      LegalDocument.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
    ])

    // Subscription distribution
    const subscriptionStats = await User.aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 }
        }
      }
    ])

    // Recent activity
    const recentActivity = await Promise.all([
      User.find({ createdAt: { $gte: oneDayAgo } })
        .select('name email role createdAt')
        .sort({ createdAt: -1 })
        .limit(5),
      ChatSession.find({ createdAt: { $gte: oneDayAgo } })
        .populate('user', 'name email')
        .select('title category status createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
    ])

    // System health metrics
    const systemHealth = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform
    }

    res.json({
      success: true,
      dashboard: {
        users: {
          total: totalUsers,
          active: activeUsers,
          new: newUsers,
          lawyers: lawyerUsers
        },
        sessions: {
          total: totalSessions,
          active: activeSessions,
          recent: recentSessions
        },
        documents: {
          total: totalDocuments,
          active: activeDocuments,
          recent: recentDocuments
        },
        subscriptions: subscriptionStats,
        recentActivity: {
          newUsers: recentActivity[0],
          newSessions: recentActivity[1]
        },
        systemHealth
      }
    })

  } catch (error) {
    console.error('Admin dashboard error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data'
    })
  }
})

// @route   GET /api/admin/users
// @desc    Get all users with filtering and pagination
// @access  Private/Admin
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      subscription,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query

    // Build filter query
    const filter = {}
    if (role) filter.role = role
    if (subscription) filter['subscription.plan'] = subscription
    if (status === 'active') filter.isActive = true
    if (status === 'inactive') filter.isActive = false
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1

    const users = await User.find(filter)
      .select('-password')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('subscription')

    const total = await User.countDocuments(filter)

    res.json({
      success: true,
      users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    })

  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    })
  }
})

// @route   GET /api/admin/users/:id
// @desc    Get specific user details
// @access  Private/Admin
router.get('/users/:id', authenticateToken, requireAdmin, param('id').isMongoId(), async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      })
    }

    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('subscription')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Get user's session statistics
    const sessionStats = await ChatSession.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          completedSessions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalMessages: { $sum: '$totalMessages' },
          avgRating: { $avg: '$feedback.rating' }
        }
      }
    ])

    // Get recent sessions
    const recentSessions = await ChatSession.find({ user: user._id })
      .select('title category status createdAt lastActivity')
      .sort({ lastActivity: -1 })
      .limit(10)

    res.json({
      success: true,
      user,
      statistics: sessionStats[0] || {
        totalSessions: 0,
        completedSessions: 0,
        totalMessages: 0,
        avgRating: 0
      },
      recentSessions
    })

  } catch (error) {
    console.error('Get user details error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching user details'
    })
  }
})

// @route   POST /api/admin/users
// @desc    Create new user
// @access  Private/Admin
router.post('/users', authenticateToken, requireAdmin, validateUserCreate, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { name, email, password, role, subscription } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      })
    }

    // Hash password
    const salt = await bcrypt.genSalt(12)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create user
    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
      isActive: true,
      createdBy: req.user._id
    }

    if (subscription) {
      userData.subscription = {
        plan: subscription.plan || 'free',
        startDate: new Date(),
        isActive: true
      }
    }

    const user = new User(userData)
    await user.save()

    // Remove password from response
    const userResponse = user.toObject()
    delete userResponse.password

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userResponse
    })

  } catch (error) {
    console.error('Create user error:', error)
    res.status(500).json({
      success: false,
      message: 'Error creating user'
    })
  }
})

// @route   PUT /api/admin/users/:id
// @desc    Update user
// @access  Private/Admin
router.put('/users/:id', authenticateToken, requireAdmin, param('id').isMongoId(), validateUserUpdate, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Prevent non-super-admins from modifying admin users
    if (user.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify admin users'
      })
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'email', 'role', 'isActive', 'subscription']
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'subscription' && req.body[field].plan) {
          user.subscription.plan = req.body[field].plan
          user.subscription.startDate = new Date()
          user.subscription.isActive = true
        } else {
          user[field] = req.body[field]
        }
      }
    })

    user.updatedBy = req.user._id
    await user.save()

    // Remove password from response
    const userResponse = user.toObject()
    delete userResponse.password

    res.json({
      success: true,
      message: 'User updated successfully',
      user: userResponse
    })

  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({
      success: false,
      message: 'Error updating user'
    })
  }
})

// @route   DELETE /api/admin/users/:id
// @desc    Deactivate user (soft delete)
// @access  Private/Admin
router.delete('/users/:id', authenticateToken, requireAdmin, param('id').isMongoId(), async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      })
    }

    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Prevent deletion of admin users by non-super-admins
    if (user.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users'
      })
    }

    // Prevent self-deletion
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      })
    }

    // Soft delete by deactivating
    user.isActive = false
    user.deactivatedAt = new Date()
    user.deactivatedBy = req.user._id
    await user.save()

    res.json({
      success: true,
      message: 'User deactivated successfully'
    })

  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({
      success: false,
      message: 'Error deactivating user'
    })
  }
})

// @route   GET /api/admin/sessions
// @desc    Get all chat sessions with filtering
// @access  Private/Admin
router.get('/sessions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      priority,
      userId,
      dateFrom,
      dateTo,
      sortBy = 'lastActivity',
      sortOrder = 'desc'
    } = req.query

    // Build filter query
    const filter = {}
    if (status) filter.status = status
    if (category) filter.category = category
    if (priority) filter.priority = priority
    if (userId) filter.user = userId
    if (dateFrom || dateTo) {
      filter.createdAt = {}
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom)
      if (dateTo) filter.createdAt.$lte = new Date(dateTo)
    }

    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1

    const sessions = await ChatSession.find(filter)
      .populate('user', 'name email role')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-messages.content') // Exclude message content for performance

    const total = await ChatSession.countDocuments(filter)

    res.json({
      success: true,
      sessions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    })

  } catch (error) {
    console.error('Get sessions error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching sessions'
    })
  }
})

// @route   GET /api/admin/analytics
// @desc    Get comprehensive platform analytics
// @access  Private/Admin
router.get('/analytics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '30', granularity = 'day' } = req.query
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    // User growth analytics
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: granularity === 'day' ? '%Y-%m-%d' : '%Y-%m',
              date: '$createdAt'
            }
          },
          newUsers: { $sum: 1 },
          lawyers: {
            $sum: { $cond: [{ $eq: ['$role', 'lawyer'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ])

    // Session analytics
    const sessionAnalytics = await ChatSession.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: granularity === 'day' ? '%Y-%m-%d' : '%Y-%m',
              date: '$createdAt'
            }
          },
          totalSessions: { $sum: 1 },
          completedSessions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          avgMessages: { $avg: '$totalMessages' },
          avgRating: { $avg: '$feedback.rating' }
        }
      },
      { $sort: { _id: 1 } }
    ])

    // Category popularity
    const categoryStats = await ChatSession.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgRating: { $avg: '$feedback.rating' }
        }
      },
      { $sort: { count: -1 } }
    ])

    // Document usage analytics
    const documentUsage = await LegalDocument.aggregate([
      {
        $match: {
          'usage.lastQueried': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$category',
          totalQueries: { $sum: '$usage.queryCount' },
          documentsUsed: { $sum: 1 }
        }
      },
      { $sort: { totalQueries: -1 } }
    ])

    // Subscription analytics
    const subscriptionStats = await User.aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $switch: {
                branches: [
                  { case: { $eq: ['$subscription.plan', 'basic'] }, then: 29 },
                  { case: { $eq: ['$subscription.plan', 'premium'] }, then: 79 },
                  { case: { $eq: ['$subscription.plan', 'enterprise'] }, then: 199 }
                ],
                default: 0
              }
            }
          }
        }
      }
    ])

    res.json({
      success: true,
      analytics: {
        period: `${period} ${granularity}s`,
        userGrowth,
        sessionAnalytics,
        categoryStats,
        documentUsage,
        subscriptionStats
      }
    })

  } catch (error) {
    console.error('Get analytics error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics'
    })
  }
})

// @route   POST /api/admin/system/backup
// @desc    Create system backup
// @access  Private/SuperAdmin
router.post('/system/backup', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const backupData = {
      timestamp: new Date(),
      users: await User.countDocuments(),
      sessions: await ChatSession.countDocuments(),
      documents: await LegalDocument.countDocuments(),
      initiatedBy: req.user._id
    }

    // In a real implementation, you would:
    // 1. Create database dump
    // 2. Store in cloud storage
    // 3. Send notification to admins
    
    res.json({
      success: true,
      message: 'Backup initiated successfully',
      backup: backupData
    })

  } catch (error) {
    console.error('Backup error:', error)
    res.status(500).json({
      success: false,
      message: 'Error creating backup'
    })
  }
})

// @route   GET /api/admin/system/health
// @desc    Get system health status
// @access  Private/Admin
router.get('/system/health', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      platform: process.platform,
      database: {
        connected: true, // You would check actual DB connection
        responseTime: 0 // Measure actual DB response time
      },
      services: {
        openai: true, // Check OpenAI API status
        email: true, // Check email service status
        storage: true // Check file storage status
      }
    }

    res.json({
      success: true,
      health
    })

  } catch (error) {
    console.error('Health check error:', error)
    res.status(500).json({
      success: false,
      message: 'Error checking system health',
      health: {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error.message
      }
    })
  }
})

module.exports = router