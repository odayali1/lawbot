const mongoose = require('mongoose');
require('dotenv').config();

// Simple schema without text indexes
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

async function createElectricityLaw() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lawbot');
    console.log('Connected to MongoDB');
    
    // Delete existing documents
    await SimpleDocument.deleteMany({});
    console.log('تم حذف الوثائق الموجودة');
    
    const electricityLaw = new SimpleDocument({
      title: 'Jordanian Electricity Law',
      titleArabic: 'قانون الكهرباء الأردني',
      type: 'other',
      category: 'Administrative Law',
      officialNumber: 'رقم 10 لسنة 2002',
      publicationDate: new Date('2002-01-01'),
      effectiveDate: new Date('2002-01-01'),
      status: 'active',
      summary: 'قانون ينظم قطاع الكهرباء في المملكة الأردنية الهاشمية',
      articles: [
        {
          number: 1,
          title: 'اسم القانون',
          content: 'يسمى هذا القانون (قانون الكهرباء لسنة 2002) ويعمل به من تاريخ نشره في الجريدة الرسمية.'
        },
        {
          number: 2,
          title: 'التعريفات',
          content: `يكون للكلمات والعبارات التالية حيثما وردت في هذا القانون المعاني المخصصة لها أدناه ما لم تدل القرينة على غير ذلك:

أ. الوزارة: وزارة الطاقة والثروة المعدنية.
ب. الوزير: وزير الطاقة والثروة المعدنية.
ج. الهيئة: هيئة تنظيم قطاع الطاقة والمعادن.
د. الكهرباء: الطاقة الكهربائية بجميع أشكالها وأنواعها.
ه. توليد الكهرباء: إنتاج الطاقة الكهربائية من أي مصدر كان.
و. نقل الكهرباء: نقل الطاقة الكهربائية عبر شبكة النقل من محطات التوليد إلى شبكات التوزيع أو إلى المستهلكين الكبار مباشرة.
ز. توزيع الكهرباء: توزيع الطاقة الكهربائية من شبكة النقل أو من محطات التوليد إلى المستهلكين.
ح. شبكة النقل: الشبكة الكهربائية التي تعمل على جهد (33) كيلو فولت فما فوق.
ط. شبكة التوزيع: الشبكة الكهربائية التي تعمل على جهد أقل من (33) كيلو فولت.
ي. المستهلك: أي شخص يستهلك الطاقة الكهربائية لأغراضه الخاصة.
ك. الترخيص: الترخيص الممنوح من الهيئة لممارسة أي من أنشطة قطاع الكهرباء.
ل. المرخص له: الشخص الحاصل على ترخيص من الهيئة لممارسة أي من أنشطة قطاع الكهرباء.`
        }
      ],
      keywords: [
        { term: 'electricity', termArabic: 'كهرباء', weight: 1.0 },
        { term: 'energy', termArabic: 'طاقة', weight: 0.9 },
        { term: 'regulation', termArabic: 'تنظيم', weight: 0.8 }
      ]
    });
    
    await electricityLaw.save();
    console.log('✅ تم إنشاء وثيقة قانون الكهرباء بنجاح');
    
    // Verify
    const savedDoc = await SimpleDocument.findOne({ titleArabic: 'قانون الكهرباء الأردني' });
    if (savedDoc) {
      console.log('العنوان:', savedDoc.titleArabic);
      console.log('عدد المواد:', savedDoc.articles.length);
      
      const article2 = savedDoc.articles.find(art => art.number === 2);
      if (article2) {
        console.log('✅ المادة 2 موجودة:', article2.title);
        console.log('المحتوى (أول 100 حرف):', article2.content.substring(0, 100) + '...');
      }
    }
    
  } catch (error) {
    console.error('خطأ:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('تم قطع الاتصال مع قاعدة البيانات');
  }
}

createElectricityLaw();