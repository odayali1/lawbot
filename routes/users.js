const express = require('express');
const User = require('../models/User');
const ChatSession = require('../models/ChatSession');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Auth middleware
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user inactive'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Validation middleware
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('specialization')
    .optional()
    .isArray()
    .withMessage('Specialization must be an array'),
  body('barAssociation')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Bar association must be at least 2 characters')
];

const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, validateProfileUpdate, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, specialization, barAssociation } = req.body;
    const user = req.user;

    // Update allowed fields
    if (name) user.name = name;
    if (specialization) user.specialization = specialization;
    if (barAssociation) user.barAssociation = barAssociation;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
});

// @route   PUT /api/users/password
// @desc    Change user password
// @access  Private
router.put('/password', authenticateToken, validatePasswordChange, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
});

// @route   GET /api/users/dashboard
// @desc    Get user dashboard data
// @access  Private
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Get chat session statistics
    const totalSessions = await ChatSession.countDocuments({ user: user._id, status: 'active' });
    const recentSessions = await ChatSession.find({ user: user._id, status: 'active' })
      .select('title category createdAt analytics.totalMessages')
      .sort({ lastActivity: -1 })
      .limit(5);

    // Calculate usage statistics
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const monthlyUsage = await ChatSession.aggregate([
      {
        $match: {
          user: user._id,
          createdAt: {
            $gte: new Date(currentYear, currentMonth, 1),
            $lt: new Date(currentYear, currentMonth + 1, 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalMessages: { $sum: '$analytics.totalMessages' },
          totalTokens: { $sum: '$analytics.totalTokens' }
        }
      }
    ]);

    // Get subscription limits
    const subscriptionLimits = {
      free: { queries: 10, features: ['Basic Chat'] },
      basic: { queries: 100, features: ['Basic Chat', 'Document Search'] },
      premium: { queries: 500, features: ['Basic Chat', 'Document Search', 'Advanced Analytics'] },
      enterprise: { queries: -1, features: ['All Features', 'Priority Support', 'Custom Training'] }
    };

    const userLimit = subscriptionLimits[user.subscription.plan];
    const queriesRemaining = userLimit.queries === -1 ? 'unlimited' : Math.max(0, userLimit.queries - user.usage.queriesThisMonth);

    res.json({
      success: true,
      dashboard: {
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
          subscription: user.subscription,
          memberSince: user.createdAt
        },
        usage: {
          queriesThisMonth: user.usage.queriesThisMonth,
          queriesRemaining,
          totalQueries: user.usage.totalQueries,
          lastQueryDate: user.usage.lastQueryDate
        },
        sessions: {
          total: totalSessions,
          recent: recentSessions,
          monthlyStats: monthlyUsage[0] || { totalSessions: 0, totalMessages: 0, totalTokens: 0 }
        },
        subscription: {
          plan: user.subscription.plan,
          features: userLimit.features,
          isActive: user.subscription.isActive,
          endDate: user.subscription.endDate
        }
      }
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data'
    });
  }
});

// @route   POST /api/users/subscription
// @desc    Update user subscription
// @access  Private
router.post('/subscription', authenticateToken, async (req, res) => {
  try {
    const { plan } = req.body;
    const validPlans = ['free', 'basic', 'premium', 'enterprise'];
    
    if (!validPlans.includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan'
      });
    }

    const user = req.user;
    const currentDate = new Date();
    
    // Update subscription
    user.subscription.plan = plan;
    user.subscription.startDate = currentDate;
    
    // Set end date (1 month for paid plans)
    if (plan !== 'free') {
      const endDate = new Date(currentDate);
      endDate.setMonth(endDate.getMonth() + 1);
      user.subscription.endDate = endDate;
    }
    
    user.subscription.isActive = true;
    
    // Reset monthly usage for plan upgrade
    if (plan !== 'free') {
      user.usage.queriesThisMonth = 0;
    }

    await user.save();

    res.json({
      success: true,
      message: `Subscription updated to ${plan} plan`,
      subscription: user.subscription
    });

  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating subscription'
    });
  }
});

// @route   GET /api/users/analytics
// @desc    Get user analytics
// @access  Private
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { period = '30' } = req.query; // days
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get session analytics
    const sessionAnalytics = await ChatSession.aggregate([
      {
        $match: {
          user: user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            category: '$category'
          },
          sessions: { $sum: 1 },
          messages: { $sum: '$analytics.totalMessages' },
          tokens: { $sum: '$analytics.totalTokens' }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    // Get category distribution
    const categoryStats = await ChatSession.aggregate([
      {
        $match: {
          user: user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgMessages: { $avg: '$analytics.totalMessages' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      analytics: {
        period: `${period} days`,
        sessionAnalytics,
        categoryStats,
        summary: {
          totalSessions: sessionAnalytics.reduce((sum, item) => sum + item.sessions, 0),
          totalMessages: sessionAnalytics.reduce((sum, item) => sum + item.messages, 0),
          totalTokens: sessionAnalytics.reduce((sum, item) => sum + item.tokens, 0)
        }
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics'
    });
  }
});

// Admin routes

// @route   GET /api/users/admin/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, subscription } = req.query;
    
    const query = {};
    if (role) query.role = role;
    if (subscription) query['subscription.plan'] = subscription;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// @route   GET /api/users/admin/stats
// @desc    Get platform statistics (admin only)
// @access  Private/Admin
router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalSessions = await ChatSession.countDocuments();
    const activeSessions = await ChatSession.countDocuments({ status: 'active' });

    // Subscription distribution
    const subscriptionStats = await User.aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 }
        }
      }
    ]);

    // Monthly growth
    const monthlyGrowth = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          newUsers: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      },
      {
        $limit: 12
      }
    ]);

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        sessions: {
          total: totalSessions,
          active: activeSessions
        },
        subscriptions: subscriptionStats,
        growth: monthlyGrowth
      }
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
});

module.exports = router;