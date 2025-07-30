const mongoose = require('mongoose');
require('dotenv').config();

async function finalSimpleInsert() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lawbot');
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('legaldocuments');
    
    // Delete existing documents
    const deleteResult = await collection.deleteMany({});
    console.log(`تم حذف ${deleteResult.deletedCount} وثيقة موجودة`);
    
    // Insert new document with minimal structure
    const electricityLaw = {
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
          number: '1',
          title: 'اسم القانون',
          content: 'يسمى هذا القانون (قانون الكهرباء لسنة 2002) ويعمل به من تاريخ نشره في الجريدة الرسمية.',
          subsections: [],
          keywords: [],
          relatedArticles: []
        },
        {
          number: '2',
          title: 'التعريفات',
          content: 'يكون للكلمات والعبارات التالية حيثما وردت في هذا القانون المعاني المخصصة لها أدناه ما لم تدل القرينة على غير ذلك:\n\nأ. الوزارة: وزارة الطاقة والثروة المعدنية.\nب. الوزير: وزير الطاقة والثروة المعدنية.\nج. الهيئة: هيئة تنظيم قطاع الطاقة والمعادن.\nد. الكهرباء: الطاقة الكهربائية بجميع أشكالها وأنواعها.\nه. توليد الكهرباء: إنتاج الطاقة الكهربائية من أي مصدر كان.\nو. نقل الكهرباء: نقل الطاقة الكهربائية عبر شبكة النقل من محطات التوليد إلى شبكات التوزيع أو إلى المستهلكين الكبار مباشرة.\nز. توزيع الكهرباء: توزيع الطاقة الكهربائية من شبكة النقل أو من محطات التوليد إلى المستهلكين.\nح. شبكة النقل: الشبكة الكهربائية التي تعمل على جهد (33) كيلو فولت فما فوق.\nط. شبكة التوزيع: الشبكة الكهربائية التي تعمل على جهد أقل من (33) كيلو فولت.\nي. المستهلك: أي شخص يستهلك الطاقة الكهربائية لأغراضه الخاصة.\nك. الترخيص: الترخيص الممنوح من الهيئة لممارسة أي من أنشطة قطاع الكهرباء.\nل. المرخص له: الشخص الحاصل على ترخيص من الهيئة لممارسة أي من أنشطة قطاع الكهرباء.',
          subsections: [],
          keywords: ['تعريفات', 'كهرباء', 'وزارة', 'هيئة'],
          relatedArticles: []
        }
      ],
      keywords: [
        { term: 'electricity', termArabic: 'كهرباء', weight: 1.0 },
        { term: 'energy', termArabic: 'طاقة', weight: 0.9 }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await collection.insertOne(electricityLaw);
    console.log('✅ تم إدراج الوثيقة بنجاح:', result.insertedId);
    
    // Verify
    const savedDoc = await collection.findOne({ titleArabic: 'قانون الكهرباء الأردني' });
    if (savedDoc) {
      console.log('\n=== التحقق من الوثيقة المحفوظة ===');
      console.log('العنوان:', savedDoc.titleArabic);
      console.log('عدد المواد:', savedDoc.articles.length);
      
      const article2 = savedDoc.articles.find(art => art.number === '2');
      if (article2) {
        console.log('✅ المادة 2 موجودة:', article2.title);
        console.log('المحتوى يحتوي على "الوزارة":', article2.content.includes('الوزارة') ? 'نعم' : 'لا');
        console.log('المحتوى يحتوي على "الكهرباء":', article2.content.includes('الكهرباء') ? 'نعم' : 'لا');
      } else {
        console.log('❌ المادة 2 غير موجودة');
      }
    }
    
  } catch (error) {
    console.error('خطأ:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nتم قطع الاتصال مع قاعدة البيانات');
  }
}

finalSimpleInsert();