const express = require('express');
const mongoose = require('mongoose');
const LegalDocument = require('../models/LegalDocument');
const User = require('../models/User');
const { body, validationResult, param, query } = require('express-validator');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const csvParser = require('csv-parser');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, and CSV files are allowed.'));
    }
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
const validateDocumentSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1 and 200 characters'),
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
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const validateDocumentCreate = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('titleArabic')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Arabic title must be between 5 and 200 characters'),
  body('type')
    .isIn([
      'constitution', 'civil_code', 'criminal_code', 'commercial_code',
      'labor_law', 'tax_law', 'administrative_law', 'family_law',
      'real_estate_law', 'intellectual_property_law', 'regulation', 'decree', 'other'
    ])
    .withMessage('Invalid document type'),
  body('category')
    .isIn([
      'Civil Law', 'Criminal Law', 'Commercial Law', 'Family Law',
      'Administrative Law', 'Constitutional Law', 'Labor Law', 'Tax Law',
      'Real Estate Law', 'Intellectual Property'
    ])
    .withMessage('Invalid category'),
  body('officialNumber')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Official number must be between 1 and 50 characters'),
  body('publicationDate')
    .isISO8601()
    .withMessage('Invalid publication date'),
  body('effectiveDate')
    .isISO8601()
    .withMessage('Invalid effective date')
];

// Helper function to extract text from uploaded files
const extractTextFromFile = async (filePath, mimetype) => {
  try {
    if (mimetype === 'application/pdf') {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (mimetype === 'text/plain') {
      return await fs.readFile(filePath, 'utf8');
    } else if (mimetype === 'text/csv') {
      // For CSV files, convert to readable text format
      const csvData = await fs.readFile(filePath, 'utf8');
      const lines = csvData.split('\n');
      let textContent = '';
      lines.forEach((line, index) => {
        if (line.trim()) {
          const columns = line.split(',').map(col => col.replace(/"/g, '').trim());
          if (index === 0) {
            textContent += 'Headers: ' + columns.join(' | ') + '\n\n';
          } else {
            textContent += 'Row ' + index + ': ' + columns.join(' | ') + '\n';
          }
        }
      });
      return textContent;
    }
    return '';
  } catch (error) {
    console.error('Text extraction error:', error);
    return '';
  }
};

// @route   GET /api/documents
// @desc    Get all legal documents with pagination
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      type,
      status = 'active',
      sortBy = 'title'
    } = req.query;

    // Build query
    const query = { status };
    if (category) query.category = category;
    if (type) query.type = type;

    // Execute query with pagination
    let documentsQuery = LegalDocument.find(query)
      .select('title titleArabic type category officialNumber publicationDate summary keywords usage.queryCount')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Apply sorting
    if (sortBy === 'date') {
      documentsQuery = documentsQuery.sort({ publicationDate: -1 });
    } else if (sortBy === 'popularity') {
      documentsQuery = documentsQuery.sort({ 'usage.queryCount': -1 });
    } else {
      documentsQuery = documentsQuery.sort({ title: 1 });
    }

    const documents = await documentsQuery;
    const total = await LegalDocument.countDocuments(query);

    res.json({
      success: true,
      documents,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get documents error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user._id,
      query: req.query,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching documents'
    });
  }
});

// @route   GET /api/documents/search
// @desc    Search legal documents
// @access  Private
router.get('/search', authenticateToken, validateDocumentSearch, async (req, res) => {
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
      q,
      category,
      type,
      status = 'active',
      page = 1,
      limit = 20,
      sortBy = 'relevance'
    } = req.query;

    // Build search query
    const searchQuery = { status };
    
    if (category) searchQuery.category = category;
    if (type) searchQuery.type = type;
    
    // Text search
    if (q) {
      searchQuery.$text = { $search: q };
    }

    // Execute search
    let documentsQuery = LegalDocument.find(searchQuery)
      .select('title titleArabic type category officialNumber publicationDate summary keywords usage.queryCount')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Apply sorting
    if (q && sortBy === 'relevance') {
      documentsQuery = documentsQuery.sort({ score: { $meta: 'textScore' } });
    } else if (sortBy === 'date') {
      documentsQuery = documentsQuery.sort({ publicationDate: -1 });
    } else if (sortBy === 'popularity') {
      documentsQuery = documentsQuery.sort({ 'usage.queryCount': -1 });
    } else {
      documentsQuery = documentsQuery.sort({ title: 1 });
    }

    const documents = await documentsQuery;
    const total = await LegalDocument.countDocuments(searchQuery);

    // Update search analytics for found documents
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
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      },
      searchInfo: {
        query: q,
        category,
        type,
        resultsFound: documents.length
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

// @route   GET /api/documents/:id
// @desc    Get specific legal document
// @access  Private
router.get('/:id', authenticateToken, param('id').isMongoId(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document ID'
      });
    }

    const document = await LegalDocument.findById(req.params.id)
      .populate('relatedLaws.documentId', 'title titleArabic officialNumber')
      .populate('metadata.uploadedBy', 'name email')
      .populate('metadata.reviewedBy', 'name email');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Increment view count
    await document.incrementUsage();

    res.json({
      success: true,
      document
    });

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching document'
    });
  }
});

// @route   GET /api/documents/:id/articles/:articleNumber
// @desc    Get specific article from a document
// @access  Private
router.get('/:id/articles/:articleNumber', authenticateToken, async (req, res) => {
  try {
    const { id, articleNumber } = req.params;
    
    const document = await LegalDocument.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const article = document.findArticle(articleNumber);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Increment usage for this specific article
    await document.incrementUsage(articleNumber);

    res.json({
      success: true,
      article,
      document: {
        title: document.title,
        titleArabic: document.titleArabic,
        officialNumber: document.officialNumber,
        type: document.type
      }
    });

  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching article'
    });
  }
});

// @route   GET /api/documents/categories
// @desc    Get available document categories and types
// @access  Private
router.get('/meta/categories', authenticateToken, async (req, res) => {
  try {
    const categories = [
      'Civil Law', 'Criminal Law', 'Commercial Law', 'Family Law',
      'Administrative Law', 'Constitutional Law', 'Labor Law', 'Tax Law',
      'Real Estate Law', 'Intellectual Property'
    ];

    const types = [
      'constitution', 'civil_code', 'criminal_code', 'commercial_code',
      'labor_law', 'tax_law', 'administrative_law', 'family_law',
      'real_estate_law', 'intellectual_property_law', 'regulation', 'decree', 'other'
    ];

    // Get document counts by category
    const categoryStats = await LegalDocument.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      categories,
      types,
      statistics: categoryStats
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories'
    });
  }
});

// Admin routes for document management

// @route   POST /api/documents
// @desc    Create new legal document (admin only)
// @access  Private/Admin
router.post('/', authenticateToken, requireAdmin, validateDocumentCreate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const documentData = {
      ...req.body,
      metadata: {
        uploadedBy: req.user._id,
        confidence: 0.8
      }
    };

    const document = new LegalDocument(documentData);
    await document.save();

    res.status(201).json({
      success: true,
      message: 'Document created successfully',
      document
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Document with this official number already exists. Please use a different official number.'
      });
    }
    
    console.error('Create document error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating document'
    });
  }
});

// @route   POST /api/documents/upload
// @desc    Upload and process legal document file (admin only)
// @access  Private/Admin
router.post('/upload', authenticateToken, requireAdmin, upload.single('document'), async (req, res) => {
  // Declare variables outside try block for error handling access
  let title, titleArabic, type, category, officialNumber, publicationDate, effectiveDate, extractedText;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    ({ title, titleArabic, type, category, officialNumber, publicationDate, effectiveDate } = req.body);

    // Log file upload details
    console.log('File upload started:', {
      userId: req.user._id,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      officialNumber,
      timestamp: new Date().toISOString()
    });

    // Extract text from uploaded file
    extractedText = await extractTextFromFile(req.file.path, req.file.mimetype);
    
    console.log('Text extraction completed:', {
      userId: req.user._id,
      fileName: req.file.originalname,
      extractedTextLength: extractedText?.length || 0,
      timestamp: new Date().toISOString()
    });

    // Create document with extracted content
    const documentData = {
      title,
      titleArabic,
      type,
      category,
      officialNumber,
      publicationDate: new Date(publicationDate),
      effectiveDate: new Date(effectiveDate),
      summary: extractedText.substring(0, 1000), // First 1000 chars as summary
      searchIndex: {
        fullText: extractedText,
        lastIndexed: new Date()
      },
      metadata: {
        uploadedBy: req.user._id,
        confidence: 0.7 // Lower confidence for auto-processed documents
      }
    };

    const document = new LegalDocument(documentData);
    await document.save();

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    res.status(201).json({
      success: true,
      message: 'Document uploaded and processed successfully',
      document: {
        id: document._id,
        title: document.title,
        type: document.type,
        category: document.category
      }
    });

  } catch (error) {
    // Clean up file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('File cleanup error:', unlinkError);
      }
    }

    // Handle MongoDB language override error
    if (error.code === 17262 || error.message?.includes('language override unsupported')) {
      console.error('MongoDB language override error:', error.message);
      
      // Try to save using raw MongoDB operation to bypass schema indexes
        try {
          const documentDataRaw = {
             title,
             titleArabic,
             type,
             category,
             officialNumber,
             publicationDate: new Date(publicationDate),
             effectiveDate: new Date(effectiveDate),
             summary: extractedText ? extractedText.substring(0, 1000) : '',
             status: 'active',
             language: 'english', // Change to english to avoid Arabic language override
             metadata: {
               uploadedBy: req.user._id,
               confidence: 0.7
             },
             usage: {
               queryCount: 0
             },
             createdAt: new Date(),
             updatedAt: new Date()
             // Completely omit keywords, searchIndex, and any text-indexed fields
           };
         
         // Use a different collection name to completely avoid existing indexes
          const result = await mongoose.connection.db.collection('documents_temp').insertOne(documentDataRaw);
          
          // Then move the document to the correct collection without triggering indexes
          await mongoose.connection.db.collection('documents_temp').deleteOne({ _id: result.insertedId });
          const finalResult = await mongoose.connection.db.collection('legaldocuments').insertOne({
            ...documentDataRaw,
            _id: result.insertedId
          }, { bypassDocumentValidation: true });
          
          console.log('Document saved with bypass (marked as inactive for large files):', {
            userId: req.user._id,
            documentId: result.insertedId,
            fileName: req.file?.originalname,
            fileSize: req.file?.size,
            reason: 'MongoDB language override error - text indexing disabled',
            timestamp: new Date().toISOString()
          });
          
          const document = { _id: result.insertedId, ...documentDataRaw };
        
        return res.status(201).json({
          success: true,
          message: 'Document uploaded successfully (text indexing disabled)',
          document: {
            id: document._id,
            title: document.title,
            type: document.type,
            category: document.category
          }
        });
      } catch (retryError) {
        console.error('Retry save error:', retryError);
        
        // Handle duplicate key error in retry
        if (retryError.code === 11000) {
          return res.status(400).json({
            success: false,
            message: 'Document with this official number already exists. Please use a different official number.'
          });
        }
      }
    }

    // Handle duplicate key error in main upload
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Document with this official number already exists. Please use a different official number.'
      });
    }

    console.error('Upload document error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading document'
    });
  }
});

// @route   PUT /api/documents/:id
// @desc    Update legal document (admin only)
// @access  Private/Admin
router.put('/:id', authenticateToken, requireAdmin, param('id').isMongoId(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document ID'
      });
    }

    const document = await LegalDocument.findById(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'titleArabic', 'summary', 'summaryArabic', 'keywords',
      'status', 'lastAmendment', 'articles', 'chapters'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        document[field] = req.body[field];
      }
    });

    // Update metadata
    document.metadata.reviewedBy = req.user._id;
    document.metadata.reviewDate = new Date();

    await document.save();

    res.json({
      success: true,
      message: 'Document updated successfully',
      document
    });

  } catch (error) {
    console.error('Upload document error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user._id,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      timestamp: new Date().toISOString()
    });
    
    // Handle specific error types
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A document with this official number already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error uploading document'
    });
  }
});

// @route   DELETE /api/documents/:id
// @desc    Delete legal document (admin only)
// @access  Private/Admin
router.delete('/:id', authenticateToken, requireAdmin, param('id').isMongoId(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document ID'
      });
    }

    const document = await LegalDocument.findById(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Soft delete by changing status to 'repealed' (valid enum value)
    document.status = 'repealed';
    await document.save();

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user._id,
      documentId: req.params.id,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      success: false,
      message: 'Error deleting document'
    });
  }
});

// @route   GET /api/documents/admin/analytics
// @desc    Get document analytics (admin only)
// @access  Private/Admin
router.get('/admin/analytics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Document statistics
    const totalDocuments = await LegalDocument.countDocuments({ status: 'active' });
    const recentDocuments = await LegalDocument.countDocuments({
      status: 'active',
      createdAt: { $gte: startDate }
    });

    // Usage analytics
    const usageStats = await LegalDocument.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          totalQueries: { $sum: '$usage.queryCount' },
          avgQueries: { $avg: '$usage.queryCount' },
          maxQueries: { $max: '$usage.queryCount' }
        }
      }
    ]);

    // Category distribution
    const categoryStats = await LegalDocument.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalQueries: { $sum: '$usage.queryCount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Most popular documents
    const popularDocuments = await LegalDocument.find({ status: 'active' })
      .select('title type category usage.queryCount')
      .sort({ 'usage.queryCount': -1 })
      .limit(10);

    res.json({
      success: true,
      analytics: {
        period: `${period} days`,
        summary: {
          totalDocuments,
          recentDocuments,
          ...usageStats[0]
        },
        categoryStats,
        popularDocuments
      }
    });

  } catch (error) {
    console.error('Get document analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching document analytics'
    });
  }
});

// @route   POST /api/documents/train-csv
// @desc    Upload and process CSV file for training
// @access  Private (Admin only)
router.post('/train-csv', authenticateToken, requireAdmin, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No CSV file uploaded'
      });
    }

    const { originalname, path: filePath, mimetype } = req.file;
    
    // Validate file type
    if (!originalname.toLowerCase().endsWith('.csv') && mimetype !== 'text/csv') {
      await fs.unlink(filePath); // Clean up uploaded file
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only CSV files are allowed for training.'
      });
    }

    // Process CSV file
    const results = [];
    let processedCount = 0;
    let errorCount = 0;

    // Read and parse CSV
    const stream = require('fs').createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          // Process each row as a potential legal document
          for (const row of results) {
            try {
              // Expected CSV columns: title, content, type, category, officialNumber, publicationDate
              const {
                title,
                titleArabic = title,
                content,
                type = 'other',
                category = 'Civil Law',
                officialNumber = `CSV-${Date.now()}-${processedCount}`,
                publicationDate = new Date().toISOString(),
                effectiveDate = publicationDate
              } = row;

              if (!title || !content) {
                errorCount++;
                continue;
              }

              // Create legal document from CSV row
              const newDocument = new LegalDocument({
                title: title.trim(),
                titleArabic: titleArabic.trim(),
                content: content.trim(),
                type: type.toLowerCase().replace(/\s+/g, '_'),
                category: category.trim(),
                officialNumber: officialNumber.trim(),
                publicationDate: new Date(publicationDate),
                effectiveDate: new Date(effectiveDate),
                summary: content.substring(0, 200) + '...',
                keywords: title.split(' ').filter(word => word.length > 3),
                uploadedBy: req.user.userId,
                status: 'active'
              });

              await newDocument.save();
              processedCount++;
            } catch (rowError) {
              console.error('Error processing CSV row:', rowError);
              errorCount++;
            }
          }

          // Clean up uploaded file
          await fs.unlink(filePath);

          res.json({
            success: true,
            message: 'CSV training data processed successfully',
            data: {
              totalRows: results.length,
              processedDocuments: processedCount,
              errors: errorCount,
              filename: originalname
            }
          });

        } catch (processingError) {
          console.error('CSV processing error:', processingError);
          await fs.unlink(filePath);
          res.status(500).json({
            success: false,
            message: 'Error processing CSV data'
          });
        }
      });

  } catch (error) {
    console.error('CSV training upload error:', error);
    if (req.file) {
      await fs.unlink(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Error uploading CSV training file'
    });
  }
});

module.exports = router;