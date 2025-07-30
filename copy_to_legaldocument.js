const mongoose = require('mongoose');
const LegalDocument = require('./models/LegalDocument');
require('dotenv').config();

// Simple schema to read from SimpleDocument collection
const simpleDocumentSchema = new mongoose.Schema({
  title: String,
  titleArabic: String,
  type: String,
  category: String,
  officialNumber: String,
  publicationDate: Date,
  effectiveDate: Date,
  status: String,
  summary: String,
  articles: [{
    number: Number,
    title: String,
    content: String
  }],
  keywords: [{
    term: String,
    termArabic: String,
    weight: Number
  }]
}, { timestamps: true });

const SimpleDocument = mongoose.model('SimpleDocument', simpleDocumentSchema);

async function copyToLegalDocument() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lawbot');
    console.log('Connected to MongoDB');
    
    // Get data from SimpleDocument
    const simpleDoc = await SimpleDocument.findOne({ titleArabic: 'قانون الكهرباء الأردني' });
    if (!simpleDoc) {
      console.log('❌ لم يتم العثور على الوثيقة في SimpleDocument');
      return;
    }
    
    console.log('✅ تم العثور على الوثيقة في SimpleDocument');
    
    // Delete existing electricity law documents from LegalDocument
    const deleteResult = await LegalDocument.deleteMany({
      $or: [
        { title: { $regex: /electric/i } },
        { titleArabic: { $regex: /كهرباء/i } }
      ]
    });
    console.log(`تم حذف ${deleteResult.deletedCount} وثيقة من LegalDocument`);
    
    // Create new LegalDocument with minimal required fields
    const electricityLaw = new LegalDocument({
      title: simpleDoc.title,
      titleArabic: simpleDoc.titleArabic,
      type: simpleDoc.type,
      category: simpleDoc.category,
      officialNumber: simpleDoc.officialNumber,
      publicationDate: simpleDoc.publicationDate,
      effectiveDate: simpleDoc.effectiveDate,
      status: simpleDoc.status,
      summary: simpleDoc.summary,
      articles: simpleDoc.articles.map(article => ({
        number: article.number.toString(),
        title: article.title,
        content: article.content,
        subsections: [],
        keywords: [],
        relatedArticles: []
      })),
      keywords: simpleDoc.keywords
    });
    
    await electricityLaw.save();
    console.log('✅ تم نسخ الوثيقة إلى LegalDocument بنجاح');
    
    // Verify
    const savedDoc = await LegalDocument.findOne({ titleArabic: 'قانون الكهرباء الأردني' });
    if (savedDoc) {
      console.log('\n=== التحقق من الوثيقة المحفوظة ===');
      console.log('العنوان:', savedDoc.titleArabic);
      console.log('عدد المواد:', savedDoc.articles.length);
      
      const article2 = savedDoc.articles.find(art => art.number === '2');
      if (article2) {
        console.log('✅ المادة 2 موجودة:', article2.title);
        console.log('المحتوى (أول 150 حرف):', article2.content.substring(0, 150) + '...');
      } else {
        console.log('❌ المادة 2 غير موجودة');
      }
    }
    
  } catch (error) {
    console.error('خطأ:', error.message);
    console.error('التفاصيل:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nتم قطع الاتصال مع قاعدة البيانات');
  }
}

copyToLegalDocument();