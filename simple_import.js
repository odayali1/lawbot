const mongoose = require('mongoose');
const LegalDocument = require('./models/LegalDocument');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function simpleImport() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lawbot');
    console.log('Connected to MongoDB');
    
    // Delete existing electricity law documents
    const deleteResult = await LegalDocument.deleteMany({
      $or: [
        { titleArabic: { $regex: /كهرباء/i } },
        { title: { $regex: /electricity/i } }
      ]
    });
    console.log(`Deleted ${deleteResult.deletedCount} existing electricity law documents`);
    
    // Create Article 27 specifically
    const electricityLaw = new LegalDocument({
      title: 'Jordanian Electricity Law',
      titleArabic: 'قانون الكهرباء الأردني',
      type: 'other',
      category: 'Administrative Law',
      officialNumber: 'LAW-10-2025',
      publicationDate: new Date('2025-01-01'),
      effectiveDate: new Date('2025-01-01'),
      status: 'active',
      summary: 'قانون ينظم قطاع الكهرباء في المملكة الأردنية الهاشمية',
      articles: [
        {
          number: '27',
          title: 'عقوبة الاعتداء على مسافات السماح الكهربائي',
          content: 'أ- يعاقب كل من يقوم بالاعتداء على مسافات السماح الكهربائي بغرامة لا تقل عن خمسمائة دينار ولا تزيد على ألف دينار وتضاعف العقوبة في حال التكرار.\nب- يعتبر مالك العقار مسؤولا عن أي اعتداء على مسافات السماح الكهربائي ما لم يثبت قيام الغير بإجراء هذا الاعتداء.\nج- يجوز للمرخص له إجراء تسوية مالية مع مالك العقار أو المعتدي شريطة قيامه بتعويض المرخص له عن الأضرار التي لحقت به ودفع الحد الأدنى من الغرامة قبل قيام النيابة العامة بإحالة الأمر إلى المحكمة المختصة.',
          subsections: [],
          keywords: ['عقوبة', 'اعتداء', 'مسافات السماح', 'كهربائي', 'غرامة'],
          relatedArticles: []
        }
      ],
      keywords: [
        { term: 'electricity', termArabic: 'كهرباء', weight: 1.0 },
        { term: 'law', termArabic: 'قانون', weight: 1.0 },
        { term: 'article 27', termArabic: 'المادة 27', weight: 1.0 }
      ]
    });
    
    await electricityLaw.save();
    console.log('✅ Successfully imported Article 27 into database');
    
    // Verify
    const savedDoc = await LegalDocument.findOne({ titleArabic: /كهرباء/ });
    if (savedDoc) {
      const article27 = savedDoc.articles.find(art => art.number === '27');
      if (article27) {
        console.log('✅ Verified: Article 27 is accessible');
        console.log('Title:', article27.title);
        console.log('Content preview:', article27.content.substring(0, 100) + '...');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

simpleImport();