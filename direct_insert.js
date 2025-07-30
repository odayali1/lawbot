const mongoose = require('mongoose');
require('dotenv').config();

async function directInsert() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lawbot');
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('legaldocuments');
    
    // Delete existing documents
    const deleteResult = await collection.deleteMany({
      $or: [
        { title: { $regex: /electric/i } },
        { titleArabic: { $regex: /كهرباء/i } }
      ]
    });
    console.log(`تم حذف ${deleteResult.deletedCount} وثيقة موجودة`);
    
    // Insert new document directly
    const electricityLaw = {
      title: 'Jordanian Electricity Law',
      titleArabic: 'قانون الكهرباء الأردني',
      type: 'other',
      category: 'Administrative Law',
      officialNumber: 'رقم 10 لسنة 2002',
      publicationDate: new Date('2002-01-01'),
      effectiveDate: new Date('2002-01-01'),
      status: 'active',
      language: 'arabic',
      summary: 'قانون ينظم قطاع الكهرباء في المملكة الأردنية الهاشمية ويحدد التعريفات والأحكام الخاصة بتوليد ونقل وتوزيع الطاقة الكهربائية',
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
ل. المرخص له: الشخص الحاصل على ترخيص من الهيئة لممارسة أي من أنشطة قطاع الكهرباء.`,
          subsections: [],
          keywords: ['تعريفات', 'كهرباء', 'وزارة', 'هيئة', 'توليد', 'نقل', 'توزيع'],
          relatedArticles: []
        }
      ],
      chapters: [],
      keywords: [
        { term: 'electricity', termArabic: 'كهرباء', weight: 1.0 },
        { term: 'energy', termArabic: 'طاقة', weight: 0.9 },
        { term: 'regulation', termArabic: 'تنظيم', weight: 0.8 },
        { term: 'electricity sector', termArabic: 'قطاع الكهرباء', weight: 0.9 }
      ],
      relatedLaws: [],
      source: {
        verified: false
      },
      searchIndex: {
        fullText: 'قانون الكهرباء الأردني رقم 10 لسنة 2002 المادة 2 تعريفات كهرباء طاقة توليد نقل توزيع ترخيص هيئة تنظيم وزارة الطاقة',
        arabicText: 'قانون الكهرباء الأردني رقم 10 لسنة 2002 المادة 2 تعريفات كهرباء طاقة توليد نقل توزيع ترخيص هيئة تنظيم وزارة الطاقة',
        lastIndexed: new Date()
      },
      usage: {
        queryCount: 0,
        popularArticles: []
      },
      metadata: {
        confidence: 0.8,
        tags: ['electricity', 'energy', 'law']
      },
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
        console.log('عدد الكلمات المفتاحية:', article2.keywords.length);
        console.log('المحتوى (أول 150 حرف):', article2.content.substring(0, 150) + '...');
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

directInsert();