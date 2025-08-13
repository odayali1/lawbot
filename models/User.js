const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const validator = require('validator')

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
    validate: {
      validator: function (v) {
        return /^[a-zA-Z\s]+$/.test(v)
      },
      message: 'Name can only contain letters and spaces'
    }
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email address'],
    index: true
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false, // Don't include password in queries by default
    validate: {
      validator: function (v) {
        // Password must contain at least one uppercase, lowercase, and number
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(v)
      },
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }
  },
  
  // User Role and Status
  role: {
    type: String,
    enum: ['user', 'lawyer', 'admin'],
    default: 'user'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Lawyer-specific Information
  licenseNumber: {
    type: String,
    required: function () {
      return this.role === 'lawyer'
    },
    trim: true,
    minlength: [5, 'License number must be at least 5 characters long'],
    maxlength: [20, 'License number cannot exceed 20 characters'],
    sparse: true, // Allow multiple null values but unique non-null values
    index: true
  },
  
  barAssociation: {
    type: String,
    required: function () {
      return this.role === 'lawyer'
    },
    trim: true,
    minlength: [2, 'Bar association must be at least 2 characters long'],
    maxlength: [100, 'Bar association cannot exceed 100 characters']
  },
  
  specialization: {
    type: String,
    trim: true,
    maxlength: [200, 'Specialization cannot exceed 200 characters']
  },
  
  // Subscription Information
  subscription: {
    plan: {
      type: String,
      enum: ['basic', 'pro', 'enterprise'],
      default: 'basic'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'past_due'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: function () {
        // Default to 30 days from now
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    },
    monthlyUsage: {
      type: Number,
      default: 0,
      min: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    },
    stripeCustomerId: {
      type: String,
      sparse: true
    },
    stripeSubscriptionId: {
      type: String,
      sparse: true
    }
  },
  
  // User Preferences
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      browser: {
        type: Boolean,
        default: true
      },
      marketing: {
        type: Boolean,
        default: false
      }
    },
    language: {
      type: String,
      enum: ['en', 'ar'],
      default: 'en'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    }
  },
  
  // Security and Authentication
  passwordResetToken: {
    type: String,
    select: false
  },
  
  passwordResetExpires: {
    type: Date,
    select: false
  },
  
  emailVerificationToken: {
    type: String,
    select: false
  },
  
  emailVerificationExpires: {
    type: Date,
    select: false
  },
  
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: {
    type: Date
  },
  
  lastLogin: {
    type: Date
  },
  
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  // Usage Statistics
  usage: {
    queriesThisMonth: {
      type: Number,
      default: 0
    },
    totalQueries: {
      type: Number,
      default: 0
    },
    lastQueryDate: {
      type: Date
    }
  },

  // Analytics and Statistics
  analytics: {
    totalSessions: {
      type: Number,
      default: 0
    },
    totalMessages: {
      type: Number,
      default: 0
    },
    averageSessionLength: {
      type: Number,
      default: 0
    },
    favoriteCategories: [{
      category: {
        type: String,
        enum: ['constitutional', 'civil', 'criminal', 'commercial', 'administrative', 'family', 'labor', 'other']
      },
      count: {
        type: Number,
        default: 0
      }
    }],
    satisfactionScore: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    totalRatings: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for better performance
userSchema.index({ email: 1 })
userSchema.index({ role: 1 })
userSchema.index({ 'subscription.plan': 1 })
userSchema.index({ 'subscription.status': 1 })
userSchema.index({ licenseNumber: 1 }, { sparse: true })
userSchema.index({ lastActivity: 1 })
userSchema.index({ createdAt: 1 })

// Virtual for account lock status
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now())
})

// Virtual for subscription remaining days
userSchema.virtual('subscriptionDaysRemaining').get(function () {
  if (!this.subscription.endDate) return 0
  const now = new Date()
  const endDate = new Date(this.subscription.endDate)
  const diffTime = endDate - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
})

// Virtual for monthly usage percentage
userSchema.virtual('usagePercentage').get(function () {
  const limits = {
    basic: parseInt(process.env.BASIC_PLAN_QUERIES) || 50,
    pro: parseInt(process.env.PRO_PLAN_QUERIES) || 200,
    enterprise: parseInt(process.env.ENTERPRISE_PLAN_QUERIES) || 1000
  }
  
  const limit = limits[this.subscription.plan] || limits.basic
  return Math.min(100, (this.subscription.monthlyUsage / limit) * 100)
})

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next()
  
  // Hash the password with cost of 12
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12
  this.password = await bcrypt.hash(this.password, saltRounds)
  
  next()
})

// Pre-save middleware to handle subscription reset
userSchema.pre('save', function (next) {
  if (this.isModified('subscription.monthlyUsage') || this.isNew) {
    const now = new Date()
    const lastReset = new Date(this.subscription.lastResetDate)
    
    // Reset usage if it's a new month
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      this.subscription.monthlyUsage = 0
      this.usage.queriesThisMonth = 0
      this.subscription.lastResetDate = now
    }
  }
  
  // Sync usage fields
  if (this.isModified('subscription.monthlyUsage')) {
    this.usage.queriesThisMonth = this.subscription.monthlyUsage
  }
  
  next()
})

// Instance method to check password
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword)
}

// Instance method to check if password was changed after JWT was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10)
    return JWTTimestamp < changedTimestamp
  }
  return false
}

// Instance method to create password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex')
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')
  
  this.passwordResetExpires = Date.now() + parseInt(process.env.PASSWORD_RESET_EXPIRE) || 10 * 60 * 1000 // 10 minutes
  
  return resetToken
}

// Instance method to create email verification token
userSchema.methods.createEmailVerificationToken = function () {
  const verificationToken = crypto.randomBytes(32).toString('hex')
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex')
  
  this.emailVerificationExpires = Date.now() + parseInt(process.env.EMAIL_VERIFICATION_EXPIRE) || 24 * 60 * 60 * 1000 // 24 hours
  
  return verificationToken
}

// Instance method to handle failed login attempts
userSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    })
  }
  
  const updates = { $inc: { loginAttempts: 1 } }
  
  // If we're at max attempts and not locked, lock account
  const maxAttempts = 5
  const lockTime = 2 * 60 * 60 * 1000 // 2 hours
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime }
  }
  
  return this.updateOne(updates)
}

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  })
}

// Instance method to update analytics
userSchema.methods.updateAnalytics = function (sessionData) {
  this.analytics.totalSessions += 1
  this.analytics.totalMessages += sessionData.messageCount || 0
  
  // Update average session length
  const currentAvg = this.analytics.averageSessionLength
  const totalSessions = this.analytics.totalSessions
  const newSessionLength = sessionData.duration || 0
  
  this.analytics.averageSessionLength = ((currentAvg * (totalSessions - 1)) + newSessionLength) / totalSessions
  
  // Update favorite categories
  if (sessionData.category) {
    const categoryIndex = this.analytics.favoriteCategories.findIndex(
      cat => cat.category === sessionData.category
    )
    
    if (categoryIndex > -1) {
      this.analytics.favoriteCategories[categoryIndex].count += 1
    } else {
      this.analytics.favoriteCategories.push({
        category: sessionData.category,
        count: 1
      })
    }
  }
  
  // Update satisfaction score if rating provided
  if (sessionData.rating) {
    const currentScore = this.analytics.satisfactionScore
    const totalRatings = this.analytics.totalRatings
    
    this.analytics.satisfactionScore = ((currentScore * totalRatings) + sessionData.rating) / (totalRatings + 1)
    this.analytics.totalRatings += 1
  }
  
  return this.save()
}

// Static method to find users by subscription plan
userSchema.statics.findBySubscriptionPlan = function (plan) {
  return this.find({ 'subscription.plan': plan, isActive: true })
}

// Static method to find users with expiring subscriptions
userSchema.statics.findExpiringSubscriptions = function (days = 7) {
  const expirationDate = new Date()
  expirationDate.setDate(expirationDate.getDate() + days)
  
  return this.find({
    'subscription.endDate': { $lte: expirationDate },
    'subscription.status': 'active',
    isActive: true
  })
}

// Instance method to check if user can make a query
userSchema.methods.canMakeQuery = function () {
  // Enterprise plan has unlimited queries
  if (this.subscription.plan === 'enterprise') {
    return true
  }
  
  // Check monthly usage limits
  const limits = {
    basic: parseInt(process.env.BASIC_PLAN_QUERIES) || 100,
    pro: parseInt(process.env.PRO_PLAN_QUERIES) || 500
  }
  
  const limit = limits[this.subscription.plan] || limits.basic
  return this.subscription.monthlyUsage < limit
}

// Instance method to increment query count
userSchema.methods.incrementQueryCount = async function () {
  this.subscription.monthlyUsage += 1
  this.usage.queriesThisMonth += 1
  this.usage.totalQueries += 1
  this.usage.lastQueryDate = new Date()
  this.lastActivity = new Date()
  return this.save()
}

// Static method to get user statistics
userSchema.statics.getUserStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        },
        verifiedUsers: {
          $sum: {
            $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0]
          }
        },
        lawyerUsers: {
          $sum: {
            $cond: [{ $eq: ['$role', 'lawyer'] }, 1, 0]
          }
        },
        basicPlanUsers: {
          $sum: {
            $cond: [{ $eq: ['$subscription.plan', 'basic'] }, 1, 0]
          }
        },
        proPlanUsers: {
          $sum: {
            $cond: [{ $eq: ['$subscription.plan', 'pro'] }, 1, 0]
          }
        },
        enterprisePlanUsers: {
          $sum: {
            $cond: [{ $eq: ['$subscription.plan', 'enterprise'] }, 1, 0]
          }
        }
      }
    }
  ])
  
  return stats[0] || {}
}

module.exports = mongoose.model('User', userSchema)