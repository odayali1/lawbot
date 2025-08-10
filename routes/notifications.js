const express = require('express')
const User = require('../models/User')
const ChatSession = require('../models/ChatSession')
const { body, validationResult, param, query } = require('express-validator')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const rateLimit = require('express-rate-limit')

const router = express.Router()

// Rate limiting for notifications
const notificationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    success: false,
    message: 'Too many notification requests, please try again later'
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

// Email transporter setup
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })
}

// Notification schema (in-memory for this example, should be in database)
const notifications = new Map()

// Notification types
const NOTIFICATION_TYPES = {
  SESSION_COMPLETED: 'session_completed',
  SUBSCRIPTION_EXPIRING: 'subscription_expiring',
  SUBSCRIPTION_EXPIRED: 'subscription_expired',
  QUERY_LIMIT_WARNING: 'query_limit_warning',
  QUERY_LIMIT_REACHED: 'query_limit_reached',
  SYSTEM_MAINTENANCE: 'system_maintenance',
  NEW_FEATURE: 'new_feature',
  SECURITY_ALERT: 'security_alert',
  DOCUMENT_UPDATED: 'document_updated'
}

// Validation middleware
const validateNotification = [
  body('type')
    .isIn(Object.values(NOTIFICATION_TYPES))
    .withMessage('Invalid notification type'),
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Message must be between 10 and 500 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  body('recipients')
    .optional()
    .isArray()
    .withMessage('Recipients must be an array')
]

const validatePreferences = [
  body('email')
    .optional()
    .isBoolean()
    .withMessage('Email preference must be boolean'),
  body('push')
    .optional()
    .isBoolean()
    .withMessage('Push preference must be boolean'),
  body('sms')
    .optional()
    .isBoolean()
    .withMessage('SMS preference must be boolean'),
  body('categories')
    .optional()
    .isArray()
    .withMessage('Categories must be an array')
]

// Apply rate limiting
router.use(notificationRateLimit)

// Helper function to create notification
const createNotification = (userId, type, title, message, data = {}) => {
  const notification = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    userId,
    type,
    title,
    message,
    data,
    read: false,
    createdAt: new Date(),
    priority: data.priority || 'medium'
  }

  if (!notifications.has(userId)) {
    notifications.set(userId, [])
  }
  notifications.get(userId).push(notification)
  
  return notification
}

// Helper function to send email notification
const sendEmailNotification = async (user, notification) => {
  try {
    if (!user.notificationPreferences?.email) return

    const transporter = createEmailTransporter()
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@lawbot.com',
      to: user.email,
      subject: `LawBot - ${notification.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1e40af; color: white; padding: 20px; text-align: center;">
            <h1>LawBot</h1>
          </div>
          <div style="padding: 20px; background-color: #f9fafb;">
            <h2 style="color: #1f2937;">${notification.title}</h2>
            <p style="color: #4b5563; line-height: 1.6;">${notification.message}</p>
            ${notification.data.actionUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${notification.data.actionUrl}" 
                   style="background-color: #1e40af; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Details
                </a>
              </div>
            ` : ''}
          </div>
          <div style="padding: 20px; background-color: #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
            <p>You received this email because you have notifications enabled for your LawBot account.</p>
            <p>To unsubscribe, please update your notification preferences in your account settings.</p>
          </div>
        </div>
      `
    }

    await transporter.sendMail(mailOptions)
  } catch (error) {
    console.error('Email notification error:', error)
  }
}

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      type
    } = req.query

    const userNotifications = notifications.get(req.user._id.toString()) || []
    
    let filteredNotifications = userNotifications
    
    if (unreadOnly === 'true') {
      filteredNotifications = filteredNotifications.filter(n => !n.read)
    }
    
    if (type) {
      filteredNotifications = filteredNotifications.filter(n => n.type === type)
    }

    // Sort by creation date (newest first)
    filteredNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + parseInt(limit)
    const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex)

    const unreadCount = userNotifications.filter(n => !n.read).length

    res.json({
      success: true,
      notifications: paginatedNotifications,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(filteredNotifications.length / limit),
        total: filteredNotifications.length,
        limit: parseInt(limit)
      },
      unreadCount
    })

  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    })
  }
})

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userNotifications = notifications.get(req.user._id.toString()) || []
    const notification = userNotifications.find(n => n.id === req.params.id)

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      })
    }

    notification.read = true
    notification.readAt = new Date()

    res.json({
      success: true,
      message: 'Notification marked as read'
    })

  } catch (error) {
    console.error('Mark notification read error:', error)
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read'
    })
  }
})

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const userNotifications = notifications.get(req.user._id.toString()) || []
    
    userNotifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true
        notification.readAt = new Date()
      }
    })

    res.json({
      success: true,
      message: 'All notifications marked as read'
    })

  } catch (error) {
    console.error('Mark all notifications read error:', error)
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read'
    })
  }
})

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userNotifications = notifications.get(req.user._id.toString()) || []
    const notificationIndex = userNotifications.findIndex(n => n.id === req.params.id)

    if (notificationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      })
    }

    userNotifications.splice(notificationIndex, 1)

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    })

  } catch (error) {
    console.error('Delete notification error:', error)
    res.status(500).json({
      success: false,
      message: 'Error deleting notification'
    })
  }
})

// @route   GET /api/notifications/preferences
// @desc    Get user notification preferences
// @access  Private
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences')
    
    const defaultPreferences = {
      email: true,
      push: true,
      sms: false,
      categories: Object.values(NOTIFICATION_TYPES)
    }

    const preferences = user.notificationPreferences || defaultPreferences

    res.json({
      success: true,
      preferences
    })

  } catch (error) {
    console.error('Get notification preferences error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching notification preferences'
    })
  }
})

// @route   PUT /api/notifications/preferences
// @desc    Update user notification preferences
// @access  Private
router.put('/preferences', authenticateToken, validatePreferences, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const user = await User.findById(req.user._id)
    
    if (!user.notificationPreferences) {
      user.notificationPreferences = {}
    }

    // Update preferences
    Object.keys(req.body).forEach(key => {
      user.notificationPreferences[key] = req.body[key]
    })

    await user.save()

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: user.notificationPreferences
    })

  } catch (error) {
    console.error('Update notification preferences error:', error)
    res.status(500).json({
      success: false,
      message: 'Error updating notification preferences'
    })
  }
})

// Admin routes for sending notifications

// @route   POST /api/notifications/send
// @desc    Send notification to users (admin only)
// @access  Private/Admin
router.post('/send', authenticateToken, requireAdmin, validateNotification, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { type, title, message, recipients, priority = 'medium', sendEmail = false } = req.body

    let targetUsers = []
    
    if (recipients && recipients.length > 0) {
      // Send to specific users
      targetUsers = await User.find({ _id: { $in: recipients }, isActive: true })
    } else {
      // Send to all active users
      targetUsers = await User.find({ isActive: true })
    }

    const sentNotifications = []

    for (const user of targetUsers) {
      // Check if user wants this type of notification
      if (user.notificationPreferences?.categories && 
          !user.notificationPreferences.categories.includes(type)) {
        continue
      }

      const notification = createNotification(
        user._id.toString(),
        type,
        title,
        message,
        { priority, sentBy: req.user._id }
      )

      sentNotifications.push(notification)

      // Send email if requested and user has email notifications enabled
      if (sendEmail) {
        await sendEmailNotification(user, notification)
      }
    }

    res.json({
      success: true,
      message: `Notification sent to ${sentNotifications.length} users`,
      sentCount: sentNotifications.length,
      totalUsers: targetUsers.length
    })

  } catch (error) {
    console.error('Send notification error:', error)
    res.status(500).json({
      success: false,
      message: 'Error sending notification'
    })
  }
})

// @route   POST /api/notifications/broadcast
// @desc    Broadcast system notification to all users (admin only)
// @access  Private/Admin
router.post('/broadcast', authenticateToken, requireAdmin, validateNotification, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { type, title, message, priority = 'medium', sendEmail = false } = req.body

    const activeUsers = await User.find({ isActive: true })
    const sentNotifications = []

    for (const user of activeUsers) {
      const notification = createNotification(
        user._id.toString(),
        type,
        title,
        message,
        { priority, broadcast: true, sentBy: req.user._id }
      )

      sentNotifications.push(notification)

      // Send email if requested and user has email notifications enabled
      if (sendEmail) {
        await sendEmailNotification(user, notification)
      }
    }

    res.json({
      success: true,
      message: `Broadcast notification sent to ${sentNotifications.length} users`,
      sentCount: sentNotifications.length
    })

  } catch (error) {
    console.error('Broadcast notification error:', error)
    res.status(500).json({
      success: false,
      message: 'Error broadcasting notification'
    })
  }
})

// Automated notification functions

// Function to send session completion notification
const sendSessionCompletionNotification = async (sessionId) => {
  try {
    const session = await ChatSession.findById(sessionId).populate('user')
    if (!session) return

    const notification = createNotification(
      session.user._id.toString(),
      NOTIFICATION_TYPES.SESSION_COMPLETED,
      'Chat Session Completed',
      `Your legal consultation session "${session.title}" has been completed. You can now review the conversation and provide feedback.`,
      {
        sessionId: session._id,
        actionUrl: `/sessions/${session._id}`,
        priority: 'medium'
      }
    )

    await sendEmailNotification(session.user, notification)
  } catch (error) {
    console.error('Session completion notification error:', error)
  }
}

// Function to send subscription expiry warning
const sendSubscriptionExpiryWarning = async (userId, daysRemaining) => {
  try {
    const user = await User.findById(userId)
    if (!user) return

    const notification = createNotification(
      userId.toString(),
      NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING,
      'Subscription Expiring Soon',
      `Your ${user.subscription.plan} subscription will expire in ${daysRemaining} days. Renew now to continue enjoying premium features.`,
      {
        daysRemaining,
        actionUrl: '/subscription',
        priority: 'high'
      }
    )

    await sendEmailNotification(user, notification)
  } catch (error) {
    console.error('Subscription expiry notification error:', error)
  }
}

// Function to send query limit warning
const sendQueryLimitWarning = async (userId, remainingQueries) => {
  try {
    const user = await User.findById(userId)
    if (!user) return

    const notification = createNotification(
      userId.toString(),
      NOTIFICATION_TYPES.QUERY_LIMIT_WARNING,
      'Query Limit Warning',
      `You have ${remainingQueries} queries remaining this month. Consider upgrading your plan for unlimited access.`,
      {
        remainingQueries,
        actionUrl: '/subscription',
        priority: 'medium'
      }
    )

    await sendEmailNotification(user, notification)
  } catch (error) {
    console.error('Query limit warning notification error:', error)
  }
}

// Export notification functions for use in other modules
module.exports = {
  router,
  sendSessionCompletionNotification,
  sendSubscriptionExpiryWarning,
  sendQueryLimitWarning,
  NOTIFICATION_TYPES
}