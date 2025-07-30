const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ChatSession = require('../models/ChatSession');
const LegalDocument = require('../models/LegalDocument');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

// Rate limiting for chat routes
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per minute
  message: { message: 'Too many chat requests, please slow down.' }
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
const validateChatMessage = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters'),
  body('sessionId')
    .optional()
    .isMongoId()
    .withMessage('Invalid session ID')
];

// Jordan Legal System Prompt
const JORDAN_LEGAL_SYSTEM_PROMPT = `أنت مساعد قانوني متخصص للمحامين في الأردن. لديك معرفة شاملة بـ:

1. الدستور الأردني
2. القانون المدني الأردني
3. قانون العقوبات الأردني
4. القانون التجاري الأردني
5. قانون العمل الأردني
6. قانون الضريبة الأردني
7. القانون الإداري الأردني
8. قانون الأحوال الشخصية الأردني
9. قانون العقارات الأردني
10. قانون الكهرباء الأردني
11. التشريعات الأردنية الأخرى ذات الصلة

دورك هو:
- تقديم معلومات قانونية دقيقة بناءً على القانون الأردني
- الإشارة إلى مواد ومقاطع وأحكام قانونية محددة
- شرح المفاهيم القانونية باللغة العربية والإنجليزية عند الاقتضاء
- مساعدة المحامين في البحث القانوني والتحليل
- تقديم الاستشهادات بالقوانين واللوائح ذات الصلة
- توضيح الإجراءات والمتطلبات القانونية في الأردن

إرشادات مهمة:
- حدد دائماً القانون أو اللائحة الأردنية التي تشير إليها
- اذكر أرقام المواد والأحكام المحددة عند الإمكان
- ميز بين الأحكام الإلزامية والاختيارية
- اذكر إذا كانت القوانين قد تم تعديلها مؤخراً
- قدم إرشادات عملية مع التأكيد على الحاجة للحكم القانوني المهني
- إذا كنت غير متأكد من القانون الحالي، أوصِ بالرجوع إلى المصادر الرسمية
- اجب باللغة التي يفضلها المستخدم (العربية أو الإنجليزية)

تذكر: أنت تقدم معلومات قانونية، وليس مشورة قانونية. أوصِ دائماً بالتشاور مع محامين مؤهلين للحالات المحددة.`;

// Function to search relevant legal documents
const searchLegalDocuments = async (query, category = null) => {
  try {
    let documents = [];
    
    // Create enhanced search patterns for Arabic content
    let searchPatterns = [query];
    
    // If query contains article numbers, add variations
    if (query.includes('المادة')) {
      const articleNumMatch = query.match(/المادة\s*(\d+|[٠-٩]+|الأولى|الثانية|الثالثة|السابعة|العشرين|٢٧|27)/i);
      if (articleNumMatch) {
        const num = articleNumMatch[1];
        if (num === '27' || num === '٢٧' || num === 'السابعة والعشرين') {
          searchPatterns.push('المادة\\s*27', 'المادة\\s*٢٧', 'المادة\\s*السابعة\\s*والعشرين');
        }
      }
    }
    
    // Add electricity law specific patterns
    if (query.includes('كهرباء')) {
      searchPatterns.push('كهرباء', 'الكهرباء', 'قانون.*كهرباء');
    }
    
    // First try: Simple text search in key fields
    try {
      const searchQuery = {
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { titleArabic: { $regex: query, $options: 'i' } },
          { summary: { $regex: query, $options: 'i' } },
          { 'articles.content': { $regex: query, $options: 'i' } },
          { 'articles.title': { $regex: query, $options: 'i' } }
        ]
      };

      if (category) {
        searchQuery.category = category;
      }

      documents = await LegalDocument.find(searchQuery)
        .select('title titleArabic type category articles officialNumber summary fullText')
        .limit(5);
        
      console.log('Simple search results:', documents.length);
      
    } catch (error) {
      console.log('Simple search failed:', error.message);
    }
    
    // If still no results, try JSON fallback
    if (documents.length === 0) {
      try {
        const fs = require('fs');
        const path = require('path');
        const jsonFilePath = path.join(__dirname, '..', 'electricity_law.json');
        
        console.log('Trying JSON fallback at:', jsonFilePath);
        
        if (fs.existsSync(jsonFilePath)) {
          const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
          console.log('JSON file loaded successfully:', jsonData.titleArabic);
          
          // Search in JSON data
          const searchTerms = [query.toLowerCase(), 'كهرباء', 'electricity'];
          
          // Add article number variations for JSON search
          if (query.includes('المادة')) {
            const articleNumMatch = query.match(/المادة\s*(\d+|[٠-٩]+|الأولى|الثانية|الثالثة|السابعة|العشرين|٢٧|27)/i);
            if (articleNumMatch) {
              const num = articleNumMatch[1];
              if (num === '27' || num === '٢٧' || num === 'السابعة والعشرين') {
                searchTerms.push('المادة 27', 'المادة ٢٧', 'المادة السابعة والعشرين', 'عقوبة الاعتداء');
              }
            }
          }
          
          console.log('Searching JSON with terms:', searchTerms);
          
          // Check if any search term matches
          const matches = searchTerms.some(term => {
            const termLower = term.toLowerCase();
            return (
              (jsonData.title && jsonData.title.toLowerCase().includes(termLower)) ||
              (jsonData.titleArabic && jsonData.titleArabic.toLowerCase().includes(termLower)) ||
              (jsonData.summary && jsonData.summary.toLowerCase().includes(termLower)) ||
              (jsonData.fullText && jsonData.fullText.toLowerCase().includes(termLower)) ||
              (jsonData.articles && jsonData.articles.some(article => 
                (article.content && article.content.toLowerCase().includes(termLower)) ||
                (article.title && article.title.toLowerCase().includes(termLower)) ||
                (article.number === 27 && (termLower.includes('27') || termLower.includes('٢٧') || termLower.includes('السابعة')))
              ))
            );
          });
          
          console.log('JSON search match result:', matches);
          
          if (matches) {
            // Convert JSON format to match database format
            const convertedDoc = {
              _id: 'electricity_law_json',
              title: jsonData.title,
              titleArabic: jsonData.titleArabic,
              type: 'law',
              category: jsonData.category || 'قوانين الطاقة',
              officialNumber: jsonData.officialNumber,
              summary: jsonData.summary,
              fullText: jsonData.fullText,
              articles: jsonData.articles || []
            };
            
            documents = [convertedDoc];
            console.log('Found document in JSON fallback:', jsonData.titleArabic);
          }
        } else {
          console.log('JSON file not found at:', jsonFilePath);
        }
      } catch (jsonError) {
        console.log('JSON fallback failed:', jsonError.message);
      }
    }
    
    return documents;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

// Chat endpoint
router.post('/message', chatLimiter, authenticateToken, validateChatMessage, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { message, sessionId, category } = req.body;
    const userId = req.user._id;
    
    // Ensure userId is valid
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID not found in request'
      });
    }

    // Find or create chat session
    let session;
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, user: userId });
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Chat session not found'
        });
      }
    } else {
      session = new ChatSession({
        user: userId,
        title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        category: category || 'General Inquiry'
      });
      await session.save();
    }

    // Search for relevant legal documents
    const relevantDocs = await searchLegalDocuments(message, category);
    
    // Prepare context from relevant documents
    let context = '';
    if (relevantDocs.length > 0) {
      context = 'المستندات القانونية ذات الصلة:\n\n';
      
      relevantDocs.forEach((doc, index) => {
        context += `${index + 1}. ${doc.titleArabic || doc.title}\n`;
        if (doc.officialNumber) {
          context += `   الرقم الرسمي: ${doc.officialNumber}\n`;
        }
        
        // Add relevant articles
        if (doc.articles && doc.articles.length > 0) {
          // Check if query is asking for a specific article
          const articleMatch = message.match(/المادة\s*(\d+|[٠-٩]+|الأولى|الثانية|الثالثة|السابعة|العشرين|٢٧|27)/i);
          
          if (articleMatch) {
            const requestedArticleNum = articleMatch[1];
            let targetArticleNumber = null;
            
            if (requestedArticleNum === '27' || requestedArticleNum === '٢٧' || requestedArticleNum === 'السابعة والعشرين') {
              targetArticleNumber = 27;
            }
            
            if (targetArticleNumber) {
              const targetArticle = doc.articles.find(article => article.number === targetArticleNumber);
              if (targetArticle) {
                context += `   المادة ${targetArticle.number}: ${targetArticle.title}\n`;
                context += `   ${targetArticle.content}\n\n`;
              }
            }
          } else {
            // Add first few articles if no specific article requested
            doc.articles.slice(0, 3).forEach(article => {
              context += `   المادة ${article.number}: ${article.title}\n`;
              context += `   ${article.content.substring(0, 200)}...\n\n`;
            });
          }
        }
        
        context += '\n';
      });
    }

    // Prepare the prompt for Gemini
    const fullPrompt = `${JORDAN_LEGAL_SYSTEM_PROMPT}\n\n${context}\n\nسؤال المستخدم: ${message}\n\nيرجى تقديم إجابة دقيقة ومفصلة باللغة العربية مع الاستشهاد بالمواد القانونية المحددة عند الإمكان.`;

    // Generate response using Gemini
    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const aiResponse = response.text();

    // Add message to session
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    session.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
      relevantDocuments: relevantDocs.map(doc => ({
        id: doc._id,
        title: doc.titleArabic || doc.title,
        type: doc.type,
        category: doc.category
      }))
    });

    session.lastActivity = new Date();
    await session.save();

    // Calculate confidence score based on document relevance
    let confidence = 70; // Base confidence
    if (relevantDocs.length > 0) {
      confidence += Math.min(relevantDocs.length * 10, 30);
    }
    if (context.length > 500) {
      confidence = Math.min(confidence + 10, 95);
    }

    res.json({
      success: true,
      data: {
        sessionId: session._id,
        message: aiResponse,
        relevantDocuments: relevantDocs.map(doc => ({
          id: doc._id,
          title: doc.titleArabic || doc.title,
          type: doc.type,
          category: doc.category,
          officialNumber: doc.officialNumber
        })),
        confidence: confidence,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get chat sessions
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await ChatSession.find({ user: req.user._id })
      .select('title category lastActivity createdAt')
      .sort({ lastActivity: -1 })
      .limit(50);

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get specific chat session
router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.sessionId,
      user: req.user._id
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete chat session
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const session = await ChatSession.findOneAndDelete({
      _id: req.params.sessionId,
      user: req.user._id
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      });
    }

    res.json({
      success: true,
      message: 'Chat session deleted successfully'
    });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;