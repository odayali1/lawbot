const mongoose = require('mongoose');
const LegalDocument = require('./models/LegalDocument');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/lawbot', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createElectricityLaw() {
  try {
    console.log('=== إنشاء وثيقة قانون الكهرباء الأردني ===');
    
    // Delete existing document if any
    await LegalDocument.deleteMany({ titleArabic: 'قانون الكهرباء الأردني' });
    console.log('تم حذف أي وثائق موجودة مسبقاً');
    
    // Create new document with minimal required fields
    const newDoc = new LegalDocument({
      title: 'Jordanian Electricity Law',
      titleArabic: 'قانون الكهرباء الأردني',
      type: 'regulation',
      category: 'Civil Law',
      officialNumber: 'LAW-13-2002-' + Date.now(), // Make it unique
      publicationDate: new Date('2002-01-01'),
      effectiveDate: new Date('2002-01-01'),
      summary: 'Jordanian Electricity Law No. (13) of 2002',
      summaryArabic: 'قانون الكهرباء الأردني رقم (13) لسنة 2002',
      articles: [
        {
          number: '1',
          title: 'التسمية والنفاذ',
          content: 'يسمى هذا القانون (قانون الكهرباء لسنة 2002) ويعمل به من تاريخ نشره في الجريدة الرسمية.'
        },
        {
          number: '2',
          title: 'التعريفات',
          content: 'يكون للكلمات والعبارات التالية حيثما وردت في هذا القانون المعاني المخصصة لها أدناه ما لم تدل القرينة على غير ذلك:\n\nأ- الوزارة: وزارة الطاقة والثروة المعدنية\nب- الوزير: وزير الطاقة والثروة المعدنية\nج- الهيئة: هيئة تنظيم قطاع الطاقة والمعادن\nد- الرئيس: رئيس مجلس مفوضي الهيئة\nه- الشركة الوطنية: الشركة الوطنية للكهرباء\nو- المرخص له: أي شخص طبيعي أو اعتباري حاصل على ترخيص من الهيئة لممارسة أي من أنشطة الكهرباء\nز- الكهرباء: الطاقة الكهربائية بجميع أشكالها وأنواعها\nح- شبكة النقل: الشبكة الكهربائية المخصصة لنقل الكهرباء بجهد عالي\nط- شبكة التوزيع: الشبكة الكهربائية المخصصة لتوزيع الكهرباء بجهد متوسط ومنخفض'
        },
        {
          number: '3',
          title: 'أهداف القانون',
          content: 'يهدف هذا القانون إلى تحقيق ما يلي:\nأ- تنظيم قطاع الكهرباء وضمان تطويره\nب- ضمان توفير خدمات الكهرباء بجودة عالية وأسعار معقولة\nج- تشجيع الاستثمار في قطاع الكهرباء\nد- حماية المستهلكين والبيئة'
        }
      ],
      source: {
        verified: true,
        verifiedBy: 'system'
      }
    });
    
    const savedDoc = await newDoc.save();
    console.log('✅ تم إنشاء الوثيقة بنجاح!');
    console.log('معرف الوثيقة:', savedDoc._id);
    console.log('عنوان الوثيقة:', savedDoc.titleArabic);
    console.log('عدد المواد:', savedDoc.articles.length);
    
    // Test searching for Article 2
    console.log('\n=== اختبار البحث عن المادة 2 ===');
    const article2 = savedDoc.articles.find(article => article.number === '2');
    if (article2) {
      console.log('✅ تم العثور على المادة 2:');
      console.log('العنوان:', article2.title);
      console.log('المحتوى:', article2.content.substring(0, 200) + '...');
    } else {
      console.log('❌ لم يتم العثور على المادة 2');
    }
    
    // Test Arabic patterns
    console.log('\n=== اختبار أنماط البحث العربية ===');
    const content = savedDoc.articles.map(a => a.content).join(' ');
    const patterns = ['المادة 2', 'المادة ٢', 'المادة الثانية'];
    
    patterns.forEach(pattern => {
      const found = content.includes(pattern);
      console.log(`البحث عن "${pattern}": ${found ? '✅ موجود' : '❌ غير موجود'}`);
    });
    
  } catch (error) {
    console.error('خطأ:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nتم إغلاق الاتصال بقاعدة البيانات');
  }
}

createElectricityLaw();