const mongoose = require('mongoose');
const LegalDocument = require('./models/LegalDocument');
require('dotenv').config();

async function replaceElectricityLaw() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lawbot');
    console.log('Connected to MongoDB');
    
    // Delete existing electricity law documents
    const deleteResult = await LegalDocument.deleteMany({
      $or: [
        { title: { $regex: /electric/i } },
        { title: { $regex: /كهرباء/i } },
        { titleArabic: { $regex: /كهرباء/i } }
      ]
    });
    console.log(`تم حذف ${deleteResult.deletedCount} وثيقة موجودة`);
    
    // Create new comprehensive electricity law document
    const electricityLaw = new LegalDocument({
      title: 'Jordanian Electricity Law',
      titleArabic: 'قانون الكهرباء الأردني',
      type: 'other',
      category: 'Administrative Law',
      officialNumber: 'رقم 10 لسنة 2002',
      publicationDate: new Date('2002-01-01'),
      effectiveDate: new Date('2002-01-01'),
      status: 'active',
      summary: 'قانون ينظم قطاع الكهرباء في المملكة الأردنية الهاشمية ويحدد التعريفات والأحكام الخاصة بتوليد ونقل وتوزيع الطاقة الكهربائية',
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
        },
        {
          number: 3,
          title: 'أهداف القانون',
          content: `يهدف هذا القانون إلى:
أ. تنظيم قطاع الكهرباء وضمان تطويره بما يخدم الاقتصاد الوطني.
ب. ضمان توفير خدمات الكهرباء بجودة عالية وأسعار معقولة.
ج. تشجيع الاستثمار في قطاع الكهرباء.
د. حماية حقوق المستهلكين والمرخص لهم.`
        }
      ],
      keywords: [
         { term: 'electricity', termArabic: 'كهرباء', weight: 1.0 },
         { term: 'energy', termArabic: 'طاقة', weight: 0.9 },
         { term: 'regulation', termArabic: 'تنظيم', weight: 0.8 },
         { term: 'electricity sector', termArabic: 'قطاع الكهرباء', weight: 0.9 }
       ]
    });
    
    await electricityLaw.save();
    console.log('✅ تم إنشاء وثيقة قانون الكهرباء الجديدة بنجاح');
    
    // Verify the document was created correctly
    const savedDoc = await LegalDocument.findOne({ title: 'قانون الكهرباء الأردني' });
    if (savedDoc) {
      console.log('\n=== التحقق من الوثيقة المحفوظة ===');
      console.log('العنوان:', savedDoc.title);
      console.log('عدد المواد:', savedDoc.articles.length);
      
      // Check Article 2 specifically
      const article2 = savedDoc.articles.find(art => art.number === 2);
      if (article2) {
        console.log('\n✅ المادة 2 موجودة:');
        console.log('العنوان:', article2.title);
        console.log('المحتوى (أول 200 حرف):', article2.content.substring(0, 200) + '...');
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

replaceElectricityLaw();