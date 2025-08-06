const express = require('express');
const OpenAI = require('openai');
const ChatSession = require('../models/ChatSession');
const LegalDocument = require('../models/LegalDocument');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
const JORDAN_LEGAL_SYSTEM_PROMPT = `أنت مساعد قانوني متخصص في القانون الأردني. مهمتك هي تقديم معلومات قانونية دقيقة ومفيدة باللغة العربية.

لديك معرفة شاملة بـ:
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

التوجيهات المهمة:
- حدد دائماً القانون أو اللائحة الأردنية التي تشير إليها
- اذكر أرقام المواد والأحكام المحددة عند الإمكان
- ميز بين الأحكام الإلزامية والاختيارية
- اذكر إذا كانت القوانين قد تم تعديلها مؤخراً
- قدم التوجيه العملي مع التأكيد على الحاجة للحكم القانوني المهني
- استخدم اللغة العربية الفصحى والواضحة
- إذا لم تكن متأكداً من معلومة معينة، اذكر ذلك بوضوح
- قدم المعلومات وليس المشورة القانونية المباشرة
- ركز على القوانين الأردنية فقط

تذكر: أنت تقدم معلومات قانونية عامة وليس استشارة قانونية شخصية.

- If uncertain about current law, recommend consulting official sources
- Respond in the language the user prefers (Arabic or English)

Remember: You provide legal information, not legal advice. Always recommend consulting with qualified legal professionals for specific cases.`;

// Function to search relevant legal documents
const searchLegalDocuments = async (query, category = null) => {
  try {
    // Use regex search as primary method (more reliable)
    let documents = [];
    
    // Create enhanced search patterns for Arabic content
    let searchPatterns = [query];
    
    // If query contains article numbers, add variations
    if (query.includes('المادة')) {
      // Add patterns for different numeral formats
      const articleNumMatch = query.match(/المادة\s*(\d+|[٠-٩]+|الأولى|الثانية|الثالثة|الرابعة|الخامسة|السادسة|السابعة|الثامنة|التاسعة|العاشرة)/i);
      if (articleNumMatch) {
        const num = articleNumMatch[1];
        // Convert Arabic numerals to English
        let englishNum = num;
        if (/[٠-٩]/.test(num)) {
          englishNum = num.replace(/[٠-٩]/g, (match) => {
            const arabicToEnglish = {'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
            return arabicToEnglish[match] || match;
          });
        }
        
        // Add search patterns for the specific article number
        searchPatterns.push(`المادة\\s*${englishNum}`);
        searchPatterns.push(`المادة\\s*${num}`);
        
        // Add specific patterns for common articles
        if (englishNum === '1' || num === 'الأولى') {
          searchPatterns.push('المادة\\s*1', 'المادة\\s*الأولى', 'المادة\\s*١');
        } else if (englishNum === '2' || num === 'الثانية') {
          searchPatterns.push('المادة\\s*2', 'المادة\\s*الثانية', 'المادة\\s*٢');
        } else if (englishNum === '27') {
          // Special handling for Article 27 - add content-based search terms
          searchPatterns.push('مسافات السماح', 'الاعتداء على مسافات', 'السماح الكهربائي');
        }
      }
    }
    
    // Add electricity law specific patterns
    if (query.includes('كهرباء')) {
      searchPatterns.push('كهرباء', 'الكهرباء', 'قانون.*كهرباء');
    }
    
    // First try: Check if query is asking for a specific article number
    const articleNumMatch = query.match(/المادة\s*(\d+|[٠-٩]+)/i);
    if (articleNumMatch) {
      const num = articleNumMatch[1];
      // Convert Arabic numerals to English
      let englishNum = num;
      if (/[٠-٩]/.test(num)) {
        englishNum = num.replace(/[٠-٩]/g, (match) => {
          const arabicToEnglish = {'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
          return arabicToEnglish[match] || match;
        });
      }
      
      try {
        // Search by article number first (most reliable)
        const articleQuery = {
          'articles.number': englishNum
        };
        
        if (category) {
          articleQuery.category = category;
        }
        
        documents = await LegalDocument.find(articleQuery)
          .select('title titleArabic type category articles officialNumber summary fullText')
          .limit(5);
          
        console.log(`Article ${englishNum} search results:`, documents.length);
        
      } catch (error) {
        console.log('Article number search failed:', error.message);
      }
    }
    
    // Second try: Simple text search in key fields if no article-specific results
    if (documents.length === 0) {
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
    }
    
    // Third try: Search for electricity law specifically
    if (documents.length === 0 && query.includes('كهرباء')) {
      try {
        const electricityQuery = {
          $or: [
            { titleArabic: { $regex: 'كهرباء', $options: 'i' } },
            { title: { $regex: 'electricity', $options: 'i' } },
            { summary: { $regex: 'كهرباء', $options: 'i' } }
          ]
        };
        
        if (category) {
          electricityQuery.category = category;
        }
        
        documents = await LegalDocument.find(electricityQuery)
          .select('title titleArabic type category articles officialNumber summary fullText')
          .limit(5);
          
        console.log('Electricity law search results:', documents.length);
        
      } catch (error) {
        console.log('Electricity search failed:', error.message);
      }
    }
    
    // Fourth try: Search for article 2 content specifically
    if (documents.length === 0 && (query.includes('المادة 2') || query.includes('المادة الثانية'))) {
      try {
        const article2Query = {
          $or: [
            { 'articles.content': { $regex: 'تعريفات', $options: 'i' } },
            { 'articles.title': { $regex: 'تعريفات', $options: 'i' } },
            { 'articles.content': { $regex: 'يكون للكلمات', $options: 'i' } }
          ]
        };
        
        if (category) {
          article2Query.category = category;
        }
        
        documents = await LegalDocument.find(article2Query)
          .select('title titleArabic type category articles officialNumber summary fullText')
          .limit(5);
          
        console.log('Article 2 content search results:', documents.length);
        
      } catch (error) {
        console.log('Article 2 search failed:', error.message);
      }
    }
    
    // Skip complex regex patterns that were causing errors
    if (documents.length === 0) {
      console.log('All search attempts failed, trying text search fallback:');
      
      // Fallback to text search if regex fails
      try {
        const searchQuery = {
          $text: { $search: query }
        };

        if (category) {
          searchQuery.category = category;
        }

        documents = await LegalDocument.find(searchQuery)
          .select('title titleArabic type category articles officialNumber summary fullText')
          .limit(5)
          .sort({ score: { $meta: 'textScore' } });
      } catch (textSearchError) {
        console.log('Text search also failed:', textSearchError.message);
      }
    }
    
    // If still no results, try fallback methods
    if (documents.length === 0) {
      try {
        // Check if query contains article number and law type
        const articleMatch = query.match(/المادة\s*(\d+|الأولى|الثانية|الثالثة|الرابعة|الخامسة|السادسة|السابعة|الثامنة|التاسعة|العاشرة)/);
        const lawTypeMatch = query.match(/(كهرباء|طاقة|مدني|جزائي|تجاري|عمل|ضريبة|إداري|دستوري|عقاري|أسرة)/);
        
        let searchQuery;
        
        if (articleMatch && lawTypeMatch) {
           // Special handling for electricity law articles
           let articleSearchTerms = [];
           
           if (lawTypeMatch[1] === 'كهرباء') {
             const articleNum = articleMatch[1];
             if (articleNum === '2' || articleNum === 'الثانية') {
               // Article 2 of electricity law contains definitions
               articleSearchTerms.push('تعريفات');
             } else if (articleNum === '1' || articleNum === 'الأولى') {
               // Article 1 contains the law name
               articleSearchTerms.push('اسم القانون');
             }
           }
           
           // Search for documents containing the law type, then filter by article content
           searchQuery = {
             $and: [
               {
                 $or: [
                   { title: { $regex: lawTypeMatch[1], $options: 'i' } },
                   { titleArabic: { $regex: lawTypeMatch[1], $options: 'i' } },
                   { summary: { $regex: lawTypeMatch[1], $options: 'i' } },
                   { fullText: { $regex: lawTypeMatch[1], $options: 'i' } }
                 ]
               },
               {
                 $or: [
                   { 'articles.number': articleMatch[1] },
                   { 'articles.content': { $regex: `المادة\\s*${articleMatch[1].replace(/[+*?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' } },
                   { summary: { $regex: `المادة\\s*${articleMatch[1].replace(/[+*?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' } },
                   { fullText: { $regex: `المادة\\s*${articleMatch[1].replace(/[+*?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' } },
                   // Add specific content search terms
                   ...articleSearchTerms.map(term => ({ 'articles.content': { $regex: term, $options: 'i' } })),
                   ...articleSearchTerms.map(term => ({ 'articles.title': { $regex: term, $options: 'i' } }))
                 ]
               }
             ]
           };
        } else {
          // Create enhanced search patterns for Arabic content
          let searchPatterns = [query];
          
          // If query contains article numbers, add variations
          if (query.includes('المادة')) {
            // Add patterns for different numeral formats
            const articleNumMatch = query.match(/المادة\s*(\d+|[٠-٩]+|الأولى|الثانية|الثالثة)/i);
            if (articleNumMatch) {
              const num = articleNumMatch[1];
              if (num === '1' || num === '١' || num === 'الأولى') {
                searchPatterns.push('المادة\\s*1', 'المادة\\s*الأولى', 'المادة\\s*١');
              } else if (num === '2' || num === '٢' || num === 'الثانية') {
                searchPatterns.push('المادة\\s*2', 'المادة\\s*الثانية', 'المادة\\s*٢');
              } else if (num === '3' || num === '٣' || num === 'الثالثة') {
                searchPatterns.push('المادة\\s*3', 'المادة\\s*الثالثة', 'المادة\\s*٣');
              }
              // Add general pattern for any Arabic numerals
              if (/[٠-٩]/.test(num)) {
                searchPatterns.push(`المادة\\s*${num.replace(/[+*?^${}()|[\]\\]/g, '\\$&')}`);
              }
            }
          }
          
          searchQuery = {
             $or: [
               { title: { $regex: query, $options: 'i' } },
               { titleArabic: { $regex: query, $options: 'i' } },
               { summary: { $regex: query, $options: 'i' } },
               { fullText: { $regex: query, $options: 'i' } },
               { 'articles.content': { $regex: query, $options: 'i' } },
               // Add enhanced search patterns
               ...searchPatterns.slice(1).map(pattern => ({ summary: { $regex: pattern, $options: 'i' } })),
               ...searchPatterns.slice(1).map(pattern => ({ fullText: { $regex: pattern, $options: 'i' } }))
             ]
           };
        }

        if (category) {
          searchQuery.category = category;
        }

        documents = await LegalDocument.find(searchQuery)
          .select('title titleArabic type category articles officialNumber summary fullText')
          .limit(5);
      } catch (dbError) {
        console.log('Database search failed, trying JSON fallback:', dbError.message);
        
        // Fallback to JSON file if database is not available
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
              const articleNumMatch = query.match(/المادة\s*(\d+|[٠-٩]+|الأولى|الثانية|الثالثة)/i);
              if (articleNumMatch) {
                const num = articleNumMatch[1];
                if (num === '2' || num === '٢' || num === 'الثانية') {
                  searchTerms.push('المادة 2', 'المادة الثانية', 'المادة ٢', 'التعريفات');
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
                  (article.title && article.title.toLowerCase().includes(termLower))
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
          console.error('JSON fallback failed:', jsonError.message);
        }
      }
    }
    
    // Log search results
    console.log('Document search completed:', {
      query: query.substring(0, 50),
      category,
      documentsFound: documents.length,
      documentTitles: documents.map(doc => doc.title || doc.titleArabic),
      timestamp: new Date().toISOString()
    });

    return documents;
  } catch (error) {
    console.error('Legal document search error:', {
      error: error.message,
      stack: error.stack,
      query,
      category,
      timestamp: new Date().toISOString()
    });
    return [];
  }
};

// Function to extract legal context from documents
const extractLegalContext = (documents, query) => {
  let context = '';
  const references = [];

  documents.forEach(doc => {
    let docContext = '';
    let hasRelevantContent = false;
    
    // First, search directly in articles array
    if (doc.articles && Array.isArray(doc.articles)) {
      // Look for specific article numbers in query
      const articleNumMatch = query.match(/المادة\s*(\d+|[٠-٩]+|الأولى|الثانية|الثالثة)/i);
      
      if (articleNumMatch) {
        const num = articleNumMatch[1];
        let targetArticleNum = num;
        
        // Convert Arabic written numbers to digits
        if (num === 'الأولى') targetArticleNum = '1';
        else if (num === 'الثانية') targetArticleNum = '2';
        else if (num === 'الثالثة') targetArticleNum = '3';
        else if (num === '٢') targetArticleNum = '2';
        else if (num === '١') targetArticleNum = '1';
        else if (num === '٣') targetArticleNum = '3';
        
        // Find the specific article
        const targetArticle = doc.articles.find(article => 
          article.number === targetArticleNum || 
          article.number === num ||
          article.number.toString() === targetArticleNum.toString()
        );
        
        if (targetArticle) {
          docContext += `المادة ${targetArticle.number}: ${targetArticle.title}\n${targetArticle.content}\n\n`;
          
          references.push({
            article: targetArticle.number,
            law: doc.titleArabic || doc.title,
            section: targetArticle.title,
            relevanceScore: 0.9
          });
          hasRelevantContent = true;
        }
      }
      
      // If no specific article found, search all articles for relevant content
      if (!hasRelevantContent) {
        const relevantArticles = doc.articles.filter(article => 
          article.content.toLowerCase().includes(query.toLowerCase()) ||
          article.title.toLowerCase().includes(query.toLowerCase())
        );
        
        if (relevantArticles.length > 0) {
          relevantArticles.slice(0, 3).forEach(article => {
            docContext += `المادة ${article.number}: ${article.title}\n${article.content}\n\n`;
            
            references.push({
              article: article.number,
              law: doc.titleArabic || doc.title,
              section: article.title,
              relevanceScore: 0.8
            });
          });
          hasRelevantContent = true;
        }
      }
    }
    
    // Check if document has searchContent method (for articles)
    if (!hasRelevantContent && doc.searchContent && typeof doc.searchContent === 'function') {
      const relevantArticles = doc.searchContent(query);
      
      if (relevantArticles.length > 0) {
        relevantArticles.slice(0, 3).forEach(article => {
          docContext += `المادة ${article.number}: ${article.title}\n${article.content}\n\n`;
          
          references.push({
            article: article.number,
            law: doc.titleArabic || doc.title,
            section: article.title,
            relevanceScore: 0.8
          });
        });
        hasRelevantContent = true;
      }
    }
    
    // If no articles found, search in summary and fullText
    if (!hasRelevantContent) {
      const searchText = (doc.summary || doc.fullText || '').toLowerCase();
      const queryLower = query.toLowerCase();
      
      if (searchText.includes(queryLower)) {
        // Extract relevant portion from summary or fullText
        const content = doc.summary || doc.fullText || '';
        
        // Try to find specific articles mentioned in the query
        // Support both Arabic and English numerals, and written numbers
        const articleMatches = content.match(/المادة\s*(?:[\d١-٩]+|الأولى|الثانية|الثالثة|الرابعة|الخامسة)[^\n]*(?:\n[^\n]*)*?(?=المادة\s*(?:[\d١-٩]+|الأولى|الثانية|الثالثة|الرابعة|الخامسة)|$)/gi);
        
        if (articleMatches) {
          articleMatches.slice(0, 3).forEach((match, index) => {
            docContext += `${match.trim()}\n\n`;
            
            // Extract article number if possible
            const articleNum = match.match(/المادة\s*([\d١-٩]+)/i);
            references.push({
              article: articleNum ? articleNum[1] : `Section ${index + 1}`,
              law: doc.title,
              section: 'Content Extract',
              relevanceScore: 0.7
            });
          });
          hasRelevantContent = true;
        } else if (content.length > 0) {
          // If no specific articles found, include relevant portion
          const words = content.split(' ');
          const excerpt = words.slice(0, 200).join(' '); // First 200 words
          docContext += `${excerpt}${words.length > 200 ? '...' : ''}\n\n`;
          
          references.push({
            article: 'General',
            law: doc.title,
            section: 'Document Content',
            relevanceScore: 0.6
          });
          hasRelevantContent = true;
        }
      }
    }
    
    if (hasRelevantContent) {
      context += `\n\n${doc.title} (${doc.officialNumber || 'N/A'}):\n${docContext}`;
    }
  });

  return { context, references };
};

// @route   POST /api/chat/message
// @desc    Send a message to the legal chatbot
// @access  Private
router.post('/message', authenticateToken, chatLimiter, validateChatMessage, async (req, res) => {
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

    const { message, sessionId, category } = req.body;
    const user = req.user;

    // Check if user can make queries
    if (!user.canMakeQuery()) {
      return res.status(403).json({
        success: false,
        message: 'Query limit exceeded for your subscription plan'
      });
    }

    const startTime = Date.now();

    // Find or create chat session
    let chatSession;
    if (sessionId) {
      chatSession = await ChatSession.findOne({ _id: sessionId, user: user._id });
      if (!chatSession) {
        return res.status(404).json({
          success: false,
          message: 'Chat session not found'
        });
      }
    } else {
      // Create new session
      chatSession = new ChatSession({
        user: user._id,
        title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        category: category || 'General Inquiry'
      });
      await chatSession.save();
    }

    // Add user message to session
    await chatSession.addMessage('user', message);

    // Get relevant legal documents
    const relevantDocs = await searchLegalDocuments(message, category);
    const { context, references } = extractLegalContext(relevantDocs, message);
    
    // Log document search results
    console.log('Document search results:', {
      userId: req.user._id,
      query: message.substring(0, 100) + '...',
      category,
      documentsFound: relevantDocs.length,
      documentTitles: relevantDocs.map(doc => doc.title),
      referencesCount: references.length,
      timestamp: new Date().toISOString()
    });

    // Prepare conversation context
    const conversationHistory = chatSession.getContext(8);
    
    // Build messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: JORDAN_LEGAL_SYSTEM_PROMPT + (context ? `\n\nRelevant Legal Context:\n${context}` : '')
      },
      ...conversationHistory,
      {
        role: 'user',
        content: message
      }
    ];

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: messages,
      max_tokens: 1500,
      temperature: 0.3,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const aiResponse = completion.choices[0].message.content;
    const processingTime = Date.now() - startTime;
    const tokens = completion.usage.total_tokens;

    // Add AI response to session
    await chatSession.addMessage('assistant', aiResponse, {
      lawReferences: references,
      confidence: 0.85,
      processingTime,
      tokens
    });

    // Update user query count
    await user.incrementQueryCount();

    // Update document usage statistics
    for (const doc of relevantDocs) {
      await doc.incrementUsage();
    }

    res.json({
      success: true,
      message: aiResponse,
      sessionId: chatSession._id,
      metadata: {
        processingTime,
        tokens,
        references,
        confidence: 0.85
      },
      usage: {
        queriesRemaining: user.canMakeQuery() ? 'unlimited' : 0,
        queriesThisMonth: user.usage.queriesThisMonth
      }
    });

  } catch (error) {
    console.error('Chat message error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user._id,
      sessionId: req.body.sessionId,
      message: req.body.message?.substring(0, 100) + '...', // First 100 chars for privacy
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      success: false,
      message: 'Error processing your message'
    });
  }
});

// @route   POST /api/chat/test
// @desc    Test endpoint without authentication
// @access  Public
router.post('/test', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const startTime = Date.now();

    // Get relevant legal documents
    const relevantDocs = await searchLegalDocuments(message);
    const { context, references } = extractLegalContext(relevantDocs, message);
    
    // Log document search results
    console.log('Test document search results:', {
      query: message.substring(0, 100) + '...',
      documentsFound: relevantDocs.length,
      documentTitles: relevantDocs.map(doc => doc.title || doc.titleArabic),
      referencesCount: references.length,
      timestamp: new Date().toISOString()
    });

    // Build messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: JORDAN_LEGAL_SYSTEM_PROMPT + (context ? `\n\nRelevant Legal Context:\n${context}` : '')
      },
      {
        role: 'user',
        content: message
      }
    ];

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: messages,
      max_tokens: 1500,
      temperature: 0.3,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const aiResponse = completion.choices[0].message.content;
    const processingTime = Date.now() - startTime;
    const tokens = completion.usage.total_tokens;

    res.json({
      success: true,
      response: aiResponse,
      metadata: {
        processingTime,
        tokens,
        references,
        confidence: 0.85,
        documentsFound: relevantDocs.length
      }
    });

  } catch (error) {
    console.error('Test chat error:', {
      error: error.message,
      stack: error.stack,
      message: req.body.message?.substring(0, 100) + '...',
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      success: false,
      message: 'Error processing your message'
    });
  }
});

router.post('/message-original', authenticateToken, chatLimiter, validateChatMessage, async (req, res) => {
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

    const { message, sessionId, category } = req.body;
    const user = req.user;

    // Check if user can make queries
    if (!user.canMakeQuery()) {
      return res.status(403).json({
        success: false,
        message: 'Query limit exceeded for your subscription plan'
      });
    }

    const startTime = Date.now();

    // Find or create chat session
    let chatSession;
    if (sessionId) {
      chatSession = await ChatSession.findOne({ _id: sessionId, user: user._id });
      if (!chatSession) {
        return res.status(404).json({
          success: false,
          message: 'Chat session not found'
        });
      }
    } else {
      // Create new session
      chatSession = new ChatSession({
        user: user._id,
        title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        category: category || 'General Inquiry'
      });
      await chatSession.save();
    }

    // Add user message to session
    await chatSession.addMessage('user', message);

    // Get relevant legal documents
    const relevantDocs = await searchLegalDocuments(message, category);
    const { context, references } = extractLegalContext(relevantDocs, message);
    
    // Log document search results
    console.log('Document search results:', {
      userId: req.user._id,
      query: message.substring(0, 100) + '...',
      category,
      documentsFound: relevantDocs.length,
      documentTitles: relevantDocs.map(doc => doc.title),
      referencesCount: references.length,
      timestamp: new Date().toISOString()
    });

    // Prepare conversation context
    const conversationHistory = chatSession.getContext(8);
    
    // Build messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: JORDAN_LEGAL_SYSTEM_PROMPT + (context ? `\n\nRelevant Legal Context:\n${context}` : '')
      },
      ...conversationHistory,
      {
        role: 'user',
        content: message
      }
    ];

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: messages,
      max_tokens: 1500,
      temperature: 0.3,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const aiResponse = completion.choices[0].message.content;
    const processingTime = Date.now() - startTime;
    const tokens = completion.usage.total_tokens;

    // Add AI response to session
    await chatSession.addMessage('assistant', aiResponse, {
      lawReferences: references,
      confidence: 0.85,
      processingTime,
      tokens
    });

    // Update user query count
    await user.incrementQueryCount();

    // Update document usage statistics
    for (const doc of relevantDocs) {
      await doc.incrementUsage();
    }

    res.json({
      success: true,
      message: aiResponse,
      sessionId: chatSession._id,
      metadata: {
        processingTime,
        tokens,
        references,
        confidence: 0.85
      },
      usage: {
        queriesRemaining: user.canMakeQuery() ? 'unlimited' : 0,
        queriesThisMonth: user.usage.queriesThisMonth
      }
    });

  } catch (error) {
    console.error('Chat message error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user._id,
      sessionId: req.body.sessionId,
      message: req.body.message?.substring(0, 100) + '...', // First 100 chars for privacy
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      success: false,
      message: 'Error processing your message'
    });
  }
});

// @route   GET /api/chat/sessions
// @desc    Get user's chat sessions
// @access  Private
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, status = 'active' } = req.query;
    
    const query = {
      user: req.user._id,
      status
    };

    if (category) {
      query.category = category;
    }

    const sessions = await ChatSession.find(query)
      .sort({ lastActivity: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Transform sessions to ensure all required fields are present
    const transformedSessions = sessions.map(session => ({
      _id: session._id,
      title: session.title,
      category: session.category,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      status: session.status || 'active',
      analytics: {
        totalMessages: session.messages ? session.messages.length : (session.analytics?.totalMessages || 0),
        totalTokens: session.analytics?.totalTokens || 0,
        averageResponseTime: session.analytics?.averageResponseTime || 0
      }
    }));

    const total = await ChatSession.countDocuments(query);

    res.json({
      success: true,
      data: transformedSessions,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chat sessions'
    });
  }
});

// @route   GET /api/chat/sessions/:id
// @desc    Get specific chat session
// @access  Private
router.get('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.id,
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
      message: 'Error fetching chat session'
    });
  }
});

// @route   DELETE /api/chat/sessions/:id
// @desc    Delete a chat session
// @access  Private
router.delete('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      });
    }

    session.status = 'deleted';
    await session.save();

    res.json({
      success: true,
      message: 'Chat session deleted successfully'
    });

  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting chat session'
    });
  }
});

// @route   GET /api/chat/categories
// @desc    Get available legal categories
// @access  Private
router.get('/categories', authenticateToken, (req, res) => {
  const categories = [
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
    'General Inquiry'
  ];

  res.json({
    success: true,
    categories
  });
});

module.exports = router;