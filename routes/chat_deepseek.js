const express = require('express')
const axios = require('axios')
const ChatSession = require('../models/ChatSession')
const LegalDocument = require('../models/LegalDocument')
const SystemInstruction = require('../models/SystemInstruction')
const User = require('../models/User')
const { body, validationResult } = require('express-validator')
const rateLimit = require('express-rate-limit')
const jwt = require('jsonwebtoken')

const router = express.Router()

// DeepSeek API configuration
const DEEPSEEK_API_KEY = 'sk-c9d364d41df744148da59603520c6d2c'
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

// Rate limiting for chat routes
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per minute
  message: { message: 'Too many chat requests, please slow down.' }
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
]

// System prompt for Jordan Legal Assistant
const JORDAN_LEGAL_SYSTEM_PROMPT = `أنت مساعد قانوني متخصص في القانون الأردني. مهمتك هي تقديم معلومات قانونية دقيقة ومفيدة باللغة العربية.

التوجيهات المهمة:
1. قدم إجابات دقيقة ومفصلة بناءً على القوانين الأردنية
2. اذكر أرقام المواد والقوانين ذات الصلة عند الإمكان
3. استخدم اللغة العربية الفصحى والواضحة
4. إذا لم تكن متأكداً من معلومة معينة، اذكر ذلك بوضوح
5. قدم المعلومات وليس المشورة القانونية المباشرة
6. ركز على القوانين الأردنية فقط

تذكر: أنت تقدم معلومات قانونية عامة وليس استشارة قانونية شخصية.`

// Function to get category-specific system prompt
async function getCategorySystemPrompt (category) {
  try {
    if (!category) return JORDAN_LEGAL_SYSTEM_PROMPT
    
    const systemInstruction = await SystemInstruction.findOne({ 
      category: category, 
      isActive: true 
    })
    
    if (systemInstruction) {
      return `${JORDAN_LEGAL_SYSTEM_PROMPT}

تعليمات خاصة لفئة ${category}:
${systemInstruction.instruction}`
    }
    
    return JORDAN_LEGAL_SYSTEM_PROMPT
  } catch (error) {
    console.error('Error fetching system instruction:', error)
    return JORDAN_LEGAL_SYSTEM_PROMPT
  }
}

// Search function for legal documents
async function searchLegalDocuments (query, category = null) {
  try {
    const searchConditions = {
      $or: [
        { titleArabic: { $regex: query, $options: 'i' } },
        { title: { $regex: query, $options: 'i' } },
        { summary: { $regex: query, $options: 'i' } },
        { 'articles.content': { $regex: query, $options: 'i' } },
        { 'articles.title': { $regex: query, $options: 'i' } }
      ]
    }

    if (category) {
      searchConditions.category = category
    }

    // Enhanced search for Arabic content
    const arabicQuery = query.replace(/\d+/g, (match) => {
      const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
      return match.split('').map(digit => arabicNumerals[parseInt(digit)] || digit).join('')
    })

    // Add variations of "المادة" search
    const articleVariations = [
      query.replace(/المادة/g, 'مادة'),
      query.replace(/مادة/g, 'المادة'),
      arabicQuery
    ]

    articleVariations.forEach(variation => {
      if (variation !== query) {
        searchConditions.$or.push(
          { titleArabic: { $regex: variation, $options: 'i' } },
          { 'articles.content': { $regex: variation, $options: 'i' } },
          { 'articles.title': { $regex: variation, $options: 'i' } }
        )
      }
    })

    // Priority search for article numbers
    const articleMatch = query.match(/(?:المادة|مادة)\s*(\d+)/)
    if (articleMatch) {
      const articleNumber = articleMatch[1]
      
      // Search by article number field directly
      searchConditions.$or.unshift(
        { 'articles.number': articleNumber },
        { 'articles.number': articleNumber.toString() }
      )
    }

    const documents = await LegalDocument.find(searchConditions)
      .select('title titleArabic summary category type officialNumber articles')
      .limit(5)
      .lean()

    // Prioritize documents based on query context
    const queryLower = query.toLowerCase()
    let prioritizedDocs = [...documents]
    
    // Detect query category and prioritize accordingly
    if (queryLower.includes('عقوبات') || queryLower.includes('جنائي') || queryLower.includes('جريمة')) {
      prioritizedDocs.sort((a, b) => {
        const aIsCriminal = a.type === 'criminal_code' || a.category === 'Criminal Law'
        const bIsCriminal = b.type === 'criminal_code' || b.category === 'Criminal Law'
        if (aIsCriminal && !bIsCriminal) return -1
        if (!aIsCriminal && bIsCriminal) return 1
        return 0
      })
    } else if (queryLower.includes('كهرباء') || queryLower.includes('طاقة')) {
      prioritizedDocs.sort((a, b) => {
        const aIsElectricity = a.title?.toLowerCase().includes('كهرباء') || a.titleArabic?.toLowerCase().includes('كهرباء')
        const bIsElectricity = b.title?.toLowerCase().includes('كهرباء') || b.titleArabic?.toLowerCase().includes('كهرباء')
        if (aIsElectricity && !bIsElectricity) return -1
        if (!aIsElectricity && bIsElectricity) return 1
        return 0
      })
    }

    return prioritizedDocs
  } catch (error) {
    console.error('Search error:', error)
    return []
  }
}

// Chat message endpoint
router.post('/message', chatLimiter, authenticateToken, validateChatMessage, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { message, sessionId, category } = req.body
    const userId = req.user._id
    const startTime = Date.now()

    // Find or create chat session
    let session
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, user: userId })
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Chat session not found'
        })
      }
    } else {
      session = new ChatSession({
        user: userId,
        title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        category: category || 'General Inquiry',
        messages: []
      })
    }

    // Add user message to session
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    })

    // Use provided category or detect from message content
    let detectedCategory = category // Prioritize user-selected category
    
    if (!detectedCategory) {
      // Search for relevant legal documents to help with category detection
      const relevantDocs = await searchLegalDocuments(message)
      
      if (relevantDocs.length > 0) {
        detectedCategory = relevantDocs[0].category
      } else {
        // Try to detect category from message keywords
        const categoryKeywords = {
          'Civil Law': ['مدني', 'عقد', 'التزام', 'ضرر', 'تعويض', 'ملكية'],
          'Criminal Law': ['جنائي', 'جريمة', 'عقوبة', 'سجن', 'غرامة', 'عقوبات'],
          'Commercial Law': ['تجاري', 'شركة', 'تجارة', 'بيع', 'شراء'],
          'Family Law': ['أسرة', 'زواج', 'طلاق', 'نفقة', 'حضانة'],
          'Labor Law': ['عمل', 'موظف', 'راتب', 'إجازة', 'فصل'],
          'Administrative Law': ['إداري', 'حكومة', 'وزارة', 'موظف عام'],
          'Tax Law': ['ضريبة', 'رسوم', 'جمارك'],
          'Real Estate Law': ['عقار', 'أرض', 'بناء', 'ملكية عقارية']
        }
        
        for (const [categoryName, keywords] of Object.entries(categoryKeywords)) {
          if (keywords.some(keyword => message.includes(keyword))) {
            detectedCategory = categoryName
            break
          }
        }
      }
    }
    
    // Search for relevant legal documents with category filter
    const relevantDocs = await searchLegalDocuments(message, detectedCategory)
    
    // Get category-specific system prompt
    const systemPrompt = await getCategorySystemPrompt(detectedCategory)
    
    // Prepare context from relevant documents
    let context = ''
    if (relevantDocs.length > 0) {
      context = relevantDocs.map(doc => {
        const title = doc.titleArabic || doc.title || 'وثيقة قانونية'
        let content = doc.contentArabic || doc.content || doc.summary || ''
        
        // If query asks for specific article, include that article's content
        const articleMatch = message.match(/(?:المادة|مادة)\s*(\d+)/)
        if (articleMatch && doc.articles) {
          const articleNumber = articleMatch[1]
          const specificArticle = doc.articles.find(art => 
            art.number === articleNumber || art.number === articleNumber.toString()
          )
          
          if (specificArticle) {
            content = `المادة ${specificArticle.number}: ${specificArticle.title}\n\n${specificArticle.content}`
          }
        }
        
        return `العنوان: ${title}\nالمحتوى: ${content.substring(0, 1000)}...`
      }).join('\n\n---\n\n')
    }

    // Prepare messages for DeepSeek API
    const messages = [
      {
        role: 'system',
        content: systemPrompt + (context ? `\n\nالوثائق ذات الصلة:\n${context}` : '')
      },
      ...session.messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ]

    // Call DeepSeek API with timeout and fallback
    let aiResponse
    try {
      const response = await axios.post(DEEPSEEK_API_URL, {
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1500
      }, {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 second timeout
      })

      aiResponse = response.data.choices[0].message.content
    } catch (apiError) {
      console.error('DeepSeek API error:', apiError.message)
      
      // Fallback response based on relevant documents
      if (relevantDocs.length > 0) {
        const doc = relevantDocs[0]
        const articleMatch = message.match(/(?:المادة|مادة)\s*(\d+)/)
        
        if (articleMatch && doc.articles) {
          const articleNumber = articleMatch[1]
          const specificArticle = doc.articles.find(art => 
            art.number === articleNumber || art.number === articleNumber.toString()
          )
          
          if (specificArticle) {
            aiResponse = `بناءً على الوثائق القانونية المتاحة:\n\nالمادة ${specificArticle.number}: ${specificArticle.title}\n\n${specificArticle.content}\n\nملاحظة: هذه المعلومات مستخرجة مباشرة من الوثائق القانونية. للحصول على تفسير مفصل، يرجى المحاولة مرة أخرى لاحقاً.`
          } else {
            aiResponse = `تم العثور على معلومات قانونية ذات صلة في: ${doc.titleArabic || doc.title}\n\nللأسف، لا يمكنني تقديم تفسير مفصل في الوقت الحالي بسبب مشكلة تقنية مؤقتة. يرجى المحاولة مرة أخرى لاحقاً.\n\nيمكنك الاطلاع على الوثيقة المرجعية للحصول على المعلومات الكاملة.`
          }
        } else {
          aiResponse = `تم العثور على ${relevantDocs.length} وثيقة قانونية ذات صلة بسؤالك:\n\n${relevantDocs.map((doc, i) => `${i + 1}. ${doc.titleArabic || doc.title}`).join('\n')}\n\nللأسف، لا يمكنني تقديم تفسير مفصل في الوقت الحالي بسبب مشكلة تقنية مؤقتة. يرجى المحاولة مرة أخرى لاحقاً.`
        }
      } else {
        aiResponse = 'أعتذر، أواجه مشكلة تقنية مؤقتة في الوقت الحالي. يرجى المحاولة مرة أخرى خلال بضع دقائق.\n\nإذا كان لديك سؤال محدد حول مادة قانونية معينة، يرجى ذكر رقم المادة والقانون للحصول على إجابة أسرع.'
      }
    }

    // Add AI response to session
    session.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
      relevantDocuments: relevantDocs.map(doc => doc._id)
    })

    session.lastActivity = new Date()
    await session.save()

    // Update user query count
    await User.findByIdAndUpdate(userId, {
      $inc: { 'usage.queriesThisMonth': 1 }
    })

    // Calculate confidence score
    let confidence = 70
    if (relevantDocs.length > 0) {
      confidence += Math.min(relevantDocs.length * 10, 30)
    }
    if (context.length > 500) {
      confidence = Math.min(confidence + 10, 95)
    }

    res.json({
      success: true,
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
      timestamp: new Date(),
      metadata: {
        processingTime: Date.now() - startTime,
        documentsFound: relevantDocs.length,
        confidence: confidence
      }
    })

  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Get chat sessions
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, status = 'active' } = req.query
    
    const query = {
      user: req.user._id,
      status
    }

    if (category) {
      query.category = category
    }

    const sessions = await ChatSession.find(query)
      .sort({ lastActivity: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean()

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
    }))

    const total = await ChatSession.countDocuments(query)

    res.json({
      success: true,
      data: transformedSessions,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    })
  } catch (error) {
    console.error('Get sessions error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Get specific chat session
router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.sessionId,
      user: req.user._id
    })

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      })
    }

    res.json({
      success: true,
      data: session
    })
  } catch (error) {
    console.error('Get session error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Delete chat session
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const session = await ChatSession.findOneAndDelete({
      _id: req.params.sessionId,
      user: req.user._id
    })

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      })
    }

    res.json({
      success: true,
      message: 'Chat session deleted successfully'
    })
  } catch (error) {
    console.error('Delete session error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

module.exports = router