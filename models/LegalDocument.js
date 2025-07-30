const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  subsections: [{
    number: String,
    content: String
  }],
  keywords: [String],
  relatedArticles: [String]
});

const legalDocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  titleArabic: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: [
      'constitution',
      'civil_code',
      'criminal_code',
      'commercial_code',
      'labor_law',
      'tax_law',
      'administrative_law',
      'family_law',
      'real_estate_law',
      'intellectual_property_law',
      'regulation',
      'decree',
      'other'
    ],
    required: true
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
      'Intellectual Property'
    ],
    required: true
  },
  officialNumber: {
    type: String,
    required: true,
    unique: true
  },
  publicationDate: {
    type: Date,
    required: true
  },
  effectiveDate: {
    type: Date,
    required: true
  },
  lastAmendment: {
    date: Date,
    description: String,
    amendmentNumber: String
  },
  status: {
    type: String,
    enum: ['active', 'amended', 'repealed', 'suspended'],
    default: 'active'
  },
  articles: [articleSchema],
  chapters: [{
    number: String,
    title: String,
    titleArabic: String,
    articles: [String] // Article numbers in this chapter
  }],
  summary: {
    type: String,
    maxlength: 1000
  },
  summaryArabic: {
    type: String,
    maxlength: 1000
  },
  keywords: [{
    term: String,
    termArabic: String,
    weight: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    }
  }],
  relatedLaws: [{
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LegalDocument'
    },
    relationship: {
      type: String,
      enum: ['amends', 'repeals', 'references', 'implements', 'supersedes']
    },
    description: String
  }],
  source: {
    officialGazette: {
      issue: String,
      date: Date,
      page: Number
    },
    url: String,
    verified: {
      type: Boolean,
      default: false
    },
    verifiedBy: String,
    verificationDate: Date
  },
  searchIndex: {
    fullText: String, // Concatenated searchable text
    arabicText: String, // Arabic searchable text
    lastIndexed: {
      type: Date,
      default: Date.now
    }
  },
  usage: {
    queryCount: {
      type: Number,
      default: 0
    },
    lastQueried: Date,
    popularArticles: [{
      articleNumber: String,
      queryCount: Number
    }]
  },
  metadata: {
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewDate: Date,
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.8
    },
    tags: [String]
  }
}, {
  timestamps: true
});

// Indexes for better search performance
legalDocumentSchema.index({ type: 1, category: 1 });
legalDocumentSchema.index({ officialNumber: 1 });
legalDocumentSchema.index({ status: 1, effectiveDate: -1 });
legalDocumentSchema.index({ 'articles.number': 1 });

// Pre-save middleware to update search index
legalDocumentSchema.pre('save', function(next) {
  if (this.isModified('articles') || this.isModified('title') || this.isModified('summary')) {
    // Build full text search index
    const fullTextParts = [
      this.title,
      this.summary,
      ...this.articles.map(article => `${article.title} ${article.content}`),
      ...this.keywords.map(kw => kw.term)
    ].filter(Boolean);
    
    const arabicTextParts = [
      this.titleArabic,
      this.summaryArabic,
      ...this.keywords.map(kw => kw.termArabic)
    ].filter(Boolean);
    
    this.searchIndex.fullText = fullTextParts.join(' ');
    this.searchIndex.arabicText = arabicTextParts.join(' ');
    this.searchIndex.lastIndexed = new Date();
  }
  next();
});

// Method to find article by number
legalDocumentSchema.methods.findArticle = function(articleNumber) {
  return this.articles.find(article => article.number === articleNumber);
};

// Method to search within document
legalDocumentSchema.methods.searchContent = function(query) {
  const regex = new RegExp(query, 'i');
  return this.articles.filter(article => 
    regex.test(article.title) || 
    regex.test(article.content) ||
    article.keywords.some(keyword => regex.test(keyword))
  );
};

// Method to increment usage count
legalDocumentSchema.methods.incrementUsage = function(articleNumber = null) {
  // Initialize usage if it doesn't exist
  if (!this.usage) {
    this.usage = { queryCount: 0, popularArticles: [] };
  }
  if (typeof this.usage.queryCount !== 'number') {
    this.usage.queryCount = 0;
  }
  if (!Array.isArray(this.usage.popularArticles)) {
    this.usage.popularArticles = [];
  }
  
  this.usage.queryCount += 1;
  this.usage.lastQueried = new Date();
  
  if (articleNumber) {
    const popularArticle = this.usage.popularArticles.find(pa => pa.articleNumber === articleNumber);
    if (popularArticle) {
      popularArticle.queryCount += 1;
    } else {
      this.usage.popularArticles.push({ articleNumber, queryCount: 1 });
    }
  }
  
  return this.save();
};

module.exports = mongoose.model('LegalDocument', legalDocumentSchema);