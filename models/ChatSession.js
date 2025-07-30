const mongoose = require('mongoose');

// Enhanced message schema with attachments and improved metadata
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: [10000, 'Message content cannot exceed 10000 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    lawReferences: [{
      article: String,
      law: String,
      section: String,
      relevanceScore: {
        type: Number,
        min: 0,
        max: 1
      }
    }],
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    processingTime: Number,
    tokens: Number,
    model: String,
    temperature: Number
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }]
});

// Legal references schema for comprehensive legal document tracking
const legalReferenceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['law', 'regulation', 'case', 'article', 'precedent', 'statute'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  reference: {
    type: String,
    required: true
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  url: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'URL must be a valid HTTP/HTTPS URL'
    }
  },
  relevanceScore: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const chatSessionSchema = new mongoose.Schema({
  // Basic Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  // Session Status and Metadata
  status: {
    type: String,
    enum: ['active', 'completed', 'archived', 'deleted'],
    default: 'active',
    index: true
  },
  category: {
    type: String,
    enum: [
      'Civil Law',
      'Criminal Law',
      'Commercial Law',
      'Family Law',
      'Administrative Law',
      'Constitutional Law',
      'Labor Law',
      'Tax Law',
      'Real Estate Law',
      'Intellectual Property',
      'Immigration Law',
      'Environmental Law',
      'Corporate Law',
      'Contract Law',
      'Tort Law',
      'General Inquiry'
    ],
    default: 'General Inquiry',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Messages and Legal References
  messages: [messageSchema],
  legalReferences: [legalReferenceSchema],
  
  // Enhanced Analytics
  analytics: {
    totalMessages: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    },
    sessionDuration: {
      type: Number,
      default: 0
    },
    userEngagement: {
      messagesPerMinute: Number,
      averageMessageLength: Number,
      followUpQuestions: {
        type: Number,
        default: 0
      }
    }
  },
  
  // User Feedback
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: [1000, 'Feedback comment cannot exceed 1000 characters']
    },
    categories: [{
      type: String,
      enum: ['helpful', 'accurate', 'fast', 'comprehensive', 'easy_to_understand']
    }],
    ratedAt: Date
  },
  
  // Session Configuration
  configuration: {
    language: {
      type: String,
      enum: ['en', 'ar'],
      default: 'en'
    },
    aiModel: {
      type: String,
      default: 'gpt-4'
    },
    maxTokens: {
      type: Number,
      default: 4000
    },
    temperature: {
      type: Number,
      min: 0,
      max: 2,
      default: 0.7
    }
  },
  
  // Timestamps and Activity
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: Date,
  
  // AI Processing Metadata
  aiMetadata: {
    totalProcessingTime: {
      type: Number,
      default: 0
    },
    averageConfidence: {
      type: Number,
      min: 0,
      max: 1
    },
    modelVersions: [String],
    errorCount: {
      type: Number,
      default: 0
    },
    lastError: {
      message: String,
      timestamp: Date,
      code: String
    }
  },
  
  // Additional Metadata
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  summary: {
    type: String,
    maxlength: [1000, 'Summary cannot exceed 1000 characters']
  },
  legalContext: {
    primaryLaws: [String],
    jurisdiction: {
      type: String,
      default: 'Jordan'
    },
    complexity: {
      type: String,
      enum: ['simple', 'moderate', 'complex', 'expert'],
      default: 'simple'
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    }
  },
  
  // Sharing and Collaboration
  isShared: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['read', 'comment', 'edit'],
      default: 'read'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Comprehensive indexes for optimal query performance
chatSessionSchema.index({ user: 1, createdAt: -1 });
chatSessionSchema.index({ user: 1, status: 1 });
chatSessionSchema.index({ category: 1, status: 1 });
chatSessionSchema.index({ tags: 1 });
chatSessionSchema.index({ lastActivity: -1 });
chatSessionSchema.index({ priority: 1, status: 1 });
chatSessionSchema.index({ 'feedback.rating': 1 });
chatSessionSchema.index({ 'legalContext.complexity': 1 });
chatSessionSchema.index({ 'configuration.language': 1 });
chatSessionSchema.index({ completedAt: 1 });

// Virtual properties
chatSessionSchema.virtual('formattedDuration').get(function() {
  if (!this.analytics.sessionDuration) return '0 minutes';
  const minutes = Math.floor(this.analytics.sessionDuration / 60000);
  const seconds = Math.floor((this.analytics.sessionDuration % 60000) / 1000);
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
});

chatSessionSchema.virtual('messageCount').get(function() {
  return this.messages.length;
});

chatSessionSchema.virtual('lastMessage').get(function() {
  return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
});

chatSessionSchema.virtual('sessionAge').get(function() {
  const now = new Date();
  const created = this.createdAt;
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

chatSessionSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

chatSessionSchema.virtual('averageMessageLength').get(function() {
  if (this.messages.length === 0) return 0;
  const totalLength = this.messages.reduce((sum, msg) => sum + msg.content.length, 0);
  return Math.round(totalLength / this.messages.length);
});

// Enhanced pre-save middleware
chatSessionSchema.pre('save', function(next) {
  // Update analytics when messages are modified
  if (this.isModified('messages')) {
    this.lastActivity = new Date();
    this.analytics.totalMessages = this.messages.length;
    
    // Calculate total tokens
    this.analytics.totalTokens = this.messages.reduce((total, msg) => {
      return total + (msg.metadata?.tokens || 0);
    }, 0);
    
    // Calculate average response time
    const responseTimes = this.messages
      .filter(msg => msg.metadata?.processingTime)
      .map(msg => msg.metadata.processingTime);
    
    if (responseTimes.length > 0) {
      this.analytics.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }
    
    // Calculate session duration
    if (this.messages.length > 1) {
      const firstMessage = this.messages[0];
      const lastMessage = this.messages[this.messages.length - 1];
      this.analytics.sessionDuration = lastMessage.timestamp - firstMessage.timestamp;
    }
    
    // Update AI metadata
    const confidenceScores = this.messages
      .filter(msg => msg.metadata?.confidence)
      .map(msg => msg.metadata.confidence);
    
    if (confidenceScores.length > 0) {
      this.aiMetadata.averageConfidence = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;
    }
    
    // Auto-generate title if not set and we have messages
    if (!this.title && this.messages.length > 0) {
      const firstUserMessage = this.messages.find(msg => msg.role === 'user');
      if (firstUserMessage) {
        this.title = firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
      }
    }
  }
  
  // Update completion status
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  next();
});

// Instance Methods

// Enhanced method to add a message with attachments
chatSessionSchema.methods.addMessage = function(role, content, metadata = {}, attachments = []) {
  const message = {
    role,
    content,
    metadata,
    attachments,
    timestamp: new Date()
  };
  
  this.messages.push(message);
  this.lastActivity = new Date();
  
  return this.save();
};

// Method to add legal reference
chatSessionSchema.methods.addLegalReference = function(referenceData) {
  this.legalReferences.push({
    ...referenceData,
    addedAt: new Date()
  });
  return this.save();
};

// Method to rate the session
chatSessionSchema.methods.rateSession = function(rating, comment = '', categories = []) {
  this.feedback = {
    rating,
    comment,
    categories,
    ratedAt: new Date()
  };
  return this.save();
};

// Method to archive session
chatSessionSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

// Method to soft delete session
chatSessionSchema.methods.softDelete = function() {
  this.status = 'deleted';
  return this.save();
};

// Method to complete session
chatSessionSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Method to get conversation context for AI
chatSessionSchema.methods.getContext = function(limit = 10) {
  return this.messages
    .slice(-limit)
    .map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));
};

// Method to get session summary
chatSessionSchema.methods.getSessionSummary = function() {
  return {
    id: this._id,
    title: this.title,
    category: this.category,
    status: this.status,
    messageCount: this.messages.length,
    duration: this.formattedDuration,
    rating: this.feedback?.rating,
    createdAt: this.createdAt,
    lastActivity: this.lastActivity,
    complexity: this.legalContext.complexity
  };
};

// Method to update session configuration
chatSessionSchema.methods.updateConfiguration = function(config) {
  this.configuration = { ...this.configuration, ...config };
  return this.save();
};

// Method to share session with user
chatSessionSchema.methods.shareWith = function(userId, permission = 'read') {
  const existingShare = this.sharedWith.find(share => share.user.toString() === userId.toString());
  
  if (existingShare) {
    existingShare.permission = permission;
    existingShare.sharedAt = new Date();
  } else {
    this.sharedWith.push({
      user: userId,
      permission,
      sharedAt: new Date()
    });
  }
  
  this.isShared = true;
  return this.save();
};

// Static Methods

// Find sessions by user with pagination and filtering
chatSessionSchema.statics.findByUser = function(userId, options = {}) {
  const {
    status = 'active',
    category,
    page = 1,
    limit = 20,
    sortBy = 'lastActivity',
    sortOrder = -1
  } = options;
  
  const query = { user: userId };
  
  if (status !== 'all') {
    query.status = status;
  }
  
  if (category) {
    query.category = category;
  }
  
  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder };
  
  return this.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('user', 'name email')
    .lean();
};

// Get user session statistics
chatSessionSchema.statics.getUserSessionStats = function(userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        activeSessions: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        completedSessions: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalMessages: { $sum: '$analytics.totalMessages' },
        totalTokens: { $sum: '$analytics.totalTokens' },
        averageRating: { $avg: '$feedback.rating' },
        averageSessionDuration: { $avg: '$analytics.sessionDuration' },
        categoriesUsed: { $addToSet: '$category' }
      }
    }
  ]);
};

// Find sessions needing attention (high priority, long inactive)
chatSessionSchema.statics.findSessionsNeedingAttention = function() {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  
  return this.find({
    $or: [
      { priority: { $in: ['high', 'urgent'] }, status: 'active' },
      { lastActivity: { $lt: threeDaysAgo }, status: 'active' },
      { 'feedback.rating': { $lt: 3 } }
    ]
  })
  .populate('user', 'name email')
  .sort({ priority: -1, lastActivity: 1 });
};

// Get session analytics for admin dashboard
chatSessionSchema.statics.getSessionAnalytics = function(dateRange = {}) {
  const { startDate, endDate } = dateRange;
  const matchStage = {};
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          category: '$category'
        },
        sessionCount: { $sum: 1 },
        totalMessages: { $sum: '$analytics.totalMessages' },
        totalTokens: { $sum: '$analytics.totalTokens' },
        averageRating: { $avg: '$feedback.rating' },
        averageDuration: { $avg: '$analytics.sessionDuration' }
      }
    },
    { $sort: { '_id.date': -1, '_id.category': 1 } }
  ]);
};

// Find sessions by legal complexity
chatSessionSchema.statics.findByComplexity = function(complexity, limit = 50) {
  return this.find({ 'legalContext.complexity': complexity })
    .populate('user', 'name email role')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Search sessions by content
chatSessionSchema.statics.searchSessions = function(searchTerm, userId = null) {
  const query = {
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { summary: { $regex: searchTerm, $options: 'i' } },
      { tags: { $regex: searchTerm, $options: 'i' } },
      { 'messages.content': { $regex: searchTerm, $options: 'i' } }
    ]
  };
  
  if (userId) {
    query.user = userId;
  }
  
  return this.find(query)
    .populate('user', 'name email')
    .sort({ lastActivity: -1 })
    .limit(100);
};

module.exports = mongoose.model('ChatSession', chatSessionSchema);