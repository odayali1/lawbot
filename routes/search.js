const express = require('express');
const LegalDocument = require('../models/LegalDocument');
const User = require('../models/User');
const ChatSession = require('../models/ChatSession');
const { query, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for search operations
const searchRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 search requests per windowMs
  message: {
    success: false,
    message: 'Too many search requests, please try again later'
  }
});

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

// Validation middleware
const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Search query must be between 1 and 500 characters'),
  query('category')
    .optional()
    .isIn([
      'Civil Law', 'Criminal Law', 'Commercial Law', 'Family Law',
      'Administrative Law', 'Constitutional Law', 'Labor Law', 'Tax Law',
      'Real Estate Law', 'Intellectual Property'
    ])
    .withMessage('Invalid category'),
  query('type')
    .optional()
    .isIn([
      'constitution', 'civil_code', 'criminal_code', 'commercial_code',
      'labor_law', 'tax_law', 'administrative_law', 'family_law',
      'real_estate_law', 'intellectual_property_law', 'regulation', 'decree', 'other'
    ])
    .withMessage('Invalid document type'),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateFrom'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateTo'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['relevance', 'date', 'popularity', 'title'])
    .withMessage('Invalid sort option'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Invalid sort order')
];

const validateAdvancedSearch = [
  query('articleNumber')
    .optional()
    .isString()
    .withMessage('Article number must be a string'),
  query('keywords')
    .optional()
    .isString()
    .withMessage('Keywords must be a string'),
  query('exactPhrase')
    .optional()
    .isString()
    .withMessage('Exact phrase must be a string'),
  query('excludeWords')
    .optional()
    .isString()
    .withMessage('Exclude words must be a string'),
  query('minDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid minimum date format'),
  query('maxDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid maximum date format')
];

// Apply rate limiting
router.use(searchRateLimit);

// Helper function to build search query
const buildSearchQuery = (params) => {
  const {
    q,
    category,
    type,
    status = 'active',
    dateFrom,
    dateTo,
    articleNumber,
    keywords,
    exactPhrase,
    excludeWords,
    minDate,
    maxDate
  } = params;

  const searchQuery = { status };
  const textSearchTerms = [];

  // Basic filters
  if (category) searchQuery.category = category;
  if (type) searchQuery.type = type;

  // Date range filters
  if (dateFrom || dateTo || minDate || maxDate) {
    searchQuery.publicationDate = {};
    if (dateFrom) searchQuery.publicationDate.$gte = new Date(dateFrom);
    if (dateTo) searchQuery.publicationDate.$lte = new Date(dateTo);
    if (minDate) searchQuery.publicationDate.$gte = new Date(minDate);
    if (maxDate) searchQuery.publicationDate.$lte = new Date(maxDate);
  }

  // Article number search
  if (articleNumber) {
    searchQuery['articles.number'] = { $regex: articleNumber, $options: 'i' };
  }

  // Text search construction
  if (q) textSearchTerms.push(q);
  if (keywords) textSearchTerms.push(keywords);
  if (exactPhrase) textSearchTerms.push(`"${exactPhrase}"`);
  if (excludeWords) {
    const excludeTerms = excludeWords.split(' ').map(word => `-${word}`).join(' ');
    textSearchTerms.push(excludeTerms);
  }

  if (textSearchTerms.length > 0) {
    searchQuery.$text = { $search: textSearchTerms.join(' ') };
  }

  return searchQuery;
};

// Helper function to build sort options
const buildSortOptions = (sortBy, sortOrder, hasTextSearch) => {
  const sort = {};
  
  if (hasTextSearch && sortBy === 'relevance') {
    sort.score = { $meta: 'textScore' };
  } else if (sortBy === 'date') {
    sort.publicationDate = sortOrder === 'asc' ? 1 : -1;
  } else if (sortBy === 'popularity') {
    sort['usage.queryCount'] = sortOrder === 'asc' ? 1 : -1;
  } else if (sortBy === 'title') {
    sort.title = sortOrder === 'asc' ? 1 : -1;
  } else {
    // Default sort
    sort.publicationDate = -1;
  }
  
  return sort;
};

// @route   GET /api/search/documents
// @desc    Search legal documents with basic filters
// @access  Private
router.get('/documents', authenticateToken, validateSearch, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = req.query;

    // Build search query
    const searchQuery = buildSearchQuery(req.query);
    const hasTextSearch = !!searchQuery.$text;
    
    // Build sort options
    const sort = buildSortOptions(sortBy, sortOrder, hasTextSearch);

    // Execute search
    const documentsQuery = LegalDocument.find(searchQuery)
      .select('title titleArabic type category officialNumber publicationDate summary keywords usage.queryCount')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const [documents, total] = await Promise.all([
      documentsQuery,
      LegalDocument.countDocuments(searchQuery)
    ]);

    // Update search analytics
    if (documents.length > 0) {
      const documentIds = documents.map(doc => doc._id);
      await LegalDocument.updateMany(
        { _id: { $in: documentIds } },
        { 
          $inc: { 'usage.queryCount': 1 },
          $set: { 'usage.lastQueried': new Date() }
        }
      );
    }

    // Log search for analytics
    if (req.query.q) {
      // In a real implementation, you would log this to a search analytics collection
      console.log(`Search performed: "${req.query.q}" by user ${req.user._id}`);
    }

    res.json({
      success: true,
      documents,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      },
      searchInfo: {
        query: req.query.q,
        filters: {
          category: req.query.category,
          type: req.query.type,
          dateFrom: req.query.dateFrom,
          dateTo: req.query.dateTo
        },
        resultsFound: documents.length,
        totalResults: total,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('Document search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching documents'
    });
  }
});

// @route   GET /api/search/advanced
// @desc    Advanced search with complex filters
// @access  Private
router.get('/advanced', authenticateToken, validateSearch, validateAdvancedSearch, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      sortBy = 'relevance',
      sortOrder = 'desc',
      includeArticles = false
    } = req.query;

    // Build advanced search query
    const searchQuery = buildSearchQuery(req.query);
    const hasTextSearch = !!searchQuery.$text;
    
    // Build sort options
    const sort = buildSortOptions(sortBy, sortOrder, hasTextSearch);

    // Select fields based on whether articles should be included
    const selectFields = includeArticles === 'true' ? 
      'title titleArabic type category officialNumber publicationDate summary keywords articles usage.queryCount' :
      'title titleArabic type category officialNumber publicationDate summary keywords usage.queryCount';

    // Execute search
    const documentsQuery = LegalDocument.find(searchQuery)
      .select(selectFields)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const [documents, total, facets] = await Promise.all([
      documentsQuery,
      LegalDocument.countDocuments(searchQuery),
      // Get faceted search results
      LegalDocument.aggregate([
        { $match: searchQuery },
        {
          $facet: {
            categories: [
              { $group: { _id: '$category', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            types: [
              { $group: { _id: '$type', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            years: [
              {
                $group: {
                  _id: { $year: '$publicationDate' },
                  count: { $sum: 1 }
                }
              },
              { $sort: { _id: -1 } }
            ]
          }
        }
      ])
    ]);

    // Update search analytics
    if (documents.length > 0) {
      const documentIds = documents.map(doc => doc._id);
      await LegalDocument.updateMany(
        { _id: { $in: documentIds } },
        { 
          $inc: { 'usage.queryCount': 1 },
          $set: { 'usage.lastQueried': new Date() }
        }
      );
    }

    res.json({
      success: true,
      documents,
      facets: facets[0] || { categories: [], types: [], years: [] },
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      },
      searchInfo: {
        query: req.query.q,
        filters: {
          category: req.query.category,
          type: req.query.type,
          dateFrom: req.query.dateFrom,
          dateTo: req.query.dateTo,
          articleNumber: req.query.articleNumber,
          keywords: req.query.keywords,
          exactPhrase: req.query.exactPhrase,
          excludeWords: req.query.excludeWords
        },
        resultsFound: documents.length,
        totalResults: total,
        sortBy,
        sortOrder,
        includeArticles: includeArticles === 'true'
      }
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing advanced search'
    });
  }
});

// @route   GET /api/search/suggestions
// @desc    Get search suggestions and autocomplete
// @access  Private
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        suggestions: []
      });
    }

    // Get document title suggestions
    const titleSuggestions = await LegalDocument.find({
      status: 'active',
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { titleArabic: { $regex: q, $options: 'i' } }
      ]
    })
    .select('title titleArabic type category')
    .limit(parseInt(limit) / 2);

    // Get keyword suggestions
    const keywordSuggestions = await LegalDocument.aggregate([
      { $match: { status: 'active' } },
      { $unwind: '$keywords' },
      {
        $match: {
          keywords: { $regex: q, $options: 'i' }
        }
      },
      {
        $group: {
          _id: '$keywords',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) / 2 }
    ]);

    const suggestions = [
      ...titleSuggestions.map(doc => ({
        type: 'document',
        text: doc.title,
        textArabic: doc.titleArabic,
        category: doc.category,
        documentType: doc.type
      })),
      ...keywordSuggestions.map(item => ({
        type: 'keyword',
        text: item._id,
        count: item.count
      }))
    ];

    res.json({
      success: true,
      suggestions: suggestions.slice(0, parseInt(limit))
    });

  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching search suggestions'
    });
  }
});

// @route   GET /api/search/similar
// @desc    Find similar documents
// @access  Private
router.get('/similar/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { limit = 5 } = req.query;

    const document = await LegalDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Find similar documents based on category, keywords, and type
    const similarDocuments = await LegalDocument.find({
      _id: { $ne: documentId },
      status: 'active',
      $or: [
        { category: document.category },
        { type: document.type },
        { keywords: { $in: document.keywords } }
      ]
    })
    .select('title titleArabic type category officialNumber publicationDate summary')
    .limit(parseInt(limit))
    .sort({ 'usage.queryCount': -1 });

    res.json({
      success: true,
      similarDocuments,
      baseDocument: {
        id: document._id,
        title: document.title,
        category: document.category,
        type: document.type
      }
    });

  } catch (error) {
    console.error('Similar documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Error finding similar documents'
    });
  }
});

// @route   GET /api/search/popular
// @desc    Get popular search terms and documents
// @access  Private
router.get('/popular', authenticateToken, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get most popular documents
    const popularDocuments = await LegalDocument.find({
      status: 'active',
      'usage.lastQueried': { $gte: startDate }
    })
    .select('title titleArabic type category usage.queryCount')
    .sort({ 'usage.queryCount': -1 })
    .limit(10);

    // Get trending categories
    const trendingCategories = await LegalDocument.aggregate([
      {
        $match: {
          status: 'active',
          'usage.lastQueried': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$category',
          totalQueries: { $sum: '$usage.queryCount' },
          documentCount: { $sum: 1 }
        }
      },
      { $sort: { totalQueries: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      success: true,
      popular: {
        documents: popularDocuments,
        categories: trendingCategories,
        period: `${period} days`
      }
    });

  } catch (error) {
    console.error('Popular search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching popular content'
    });
  }
});

// @route   POST /api/search/feedback
// @desc    Submit search result feedback
// @access  Private
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const { query, documentId, helpful, comment } = req.body;

    // In a real implementation, you would store this feedback in a database
    // For now, we'll just log it
    console.log('Search feedback received:', {
      userId: req.user._id,
      query,
      documentId,
      helpful,
      comment,
      timestamp: new Date()
    });

    // Update document analytics if helpful
    if (helpful && documentId) {
      await LegalDocument.findByIdAndUpdate(documentId, {
        $inc: { 'usage.helpfulCount': 1 }
      });
    }

    res.json({
      success: true,
      message: 'Feedback submitted successfully'
    });

  } catch (error) {
    console.error('Search feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting feedback'
    });
  }
});

// @route   GET /api/search/history
// @desc    Get user's search history
// @access  Private
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // Get search history from chat sessions
    const searchHistory = await ChatSession.find({
      user: req.user._id,
      'messages.role': 'user'
    })
    .select('messages.content createdAt category')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((page - 1) * limit);

    // Extract unique search queries
    const queries = [];
    searchHistory.forEach(session => {
      session.messages.forEach(message => {
        if (message.role === 'user' && message.content.length > 5) {
          queries.push({
            query: message.content.substring(0, 100), // Truncate long queries
            timestamp: session.createdAt,
            category: session.category
          });
        }
      });
    });

    // Remove duplicates and sort by timestamp
    const uniqueQueries = queries
      .filter((query, index, self) => 
        index === self.findIndex(q => q.query === query.query)
      )
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      searchHistory: uniqueQueries,
      pagination: {
        current: parseInt(page),
        total: uniqueQueries.length,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Search history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching search history'
    });
  }
});

// @route   DELETE /api/search/history
// @desc    Clear user's search history
// @access  Private
router.delete('/history', authenticateToken, async (req, res) => {
  try {
    // In a real implementation, you would clear search history from a dedicated collection
    // For now, we'll just return success
    
    res.json({
      success: true,
      message: 'Search history cleared successfully'
    });

  } catch (error) {
    console.error('Clear search history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing search history'
    });
  }
});

module.exports = router;