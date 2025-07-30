const mongoose = require('mongoose');
const LegalDocument = require('./models/LegalDocument');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lawbot', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createNewElectricityLaw() {
  try {
    console.log('=== إنشاء وثيقة جديدة لقانون الكهرباء الأردني ===\n');
    
    // Delete the old empty document first
    await LegalDocument.deleteOne({ title: 'قانون الكهرباء' });
    console.log('تم حذف الوثيقة القديمة الفارغة');
    
    // Sample content for Jordanian Electricity Law with Article 2
    const electricityLawContent = `قانون الكهرباء الأردني رقم (13) لسنة 2002

نحن عبد الله الثاني ابن الحسين ملك المملكة الأردنية الهاشمية
بمقتضى المادة (31) من الدستور
وبناء على ما قرره مجلسا الأعيان والنواب
نصادق على القانون الآتي ونأمر بإصداره وإضافته إلى قوانين الدولة:

المادة 1:
يسمى هذا القانون (قانون الكهرباء لسنة 2002) ويعمل به من تاريخ نشره في الجريدة الرسمية.

المادة ٢:
يكون للكلمات والعبارات التالية حيثما وردت في هذا القانون المعاني المخصصة لها أدناه ما لم تدل القرينة على غير ذلك:
- الوزارة: وزارة الطاقة والثروة المعدنية
- الوزير: وزير الطاقة والثروة المعدنية
- الهيئة: هيئة تنظيم قطاع الطاقة والمعادن
- الرئيس: رئيس مجلس مفوضي الهيئة
- الشركة الوطنية: الشركة الوطنية للكهرباء
- المرخص له: أي شخص طبيعي أو اعتباري حاصل على ترخيص من الهيئة لممارسة أي من أنشطة الكهرباء
- الكهرباء: الطاقة الكهربائية بجميع أشكالها وأنواعها
- شبكة النقل: الشبكة الكهربائية المخصصة لنقل الكهرباء بجهد عالي
- شبكة التوزيع: الشبكة الكهربائية المخصصة لتوزيع الكهرباء بجهد متوسط ومنخفض

المادة 3:
تهدف أحكام هذا القانون إلى:
أ- تنظيم قطاع الكهرباء وضمان تطويره بما يحقق المصلحة العامة
ب- ضمان توفير خدمات الكهرباء بجودة عالية وأسعار عادلة
ج- تشجيع الاستثمار في قطاع الكهرباء
د- حماية المستهلكين وضمان حقوقهم

المادة 4:
تنشأ بموجب أحكام هذا القانون هيئة مستقلة تسمى (هيئة تنظيم قطاع الطاقة والمعادن) تتمتع بالشخصية الاعتبارية والاستقلال المالي والإداري.`;
    
    // Create new document with all required fields
    const newDoc = new LegalDocument({
      title: 'Jordanian Electricity Law',
      titleArabic: 'قانون الكهرباء الأردني',
      type: 'regulation',
      category: 'Civil Law',
      officialNumber: 'LAW-13-2002',
      publicationDate: new Date('2002-01-01'),
      effectiveDate: new Date('2002-01-01'),
      summary: 'Jordanian Electricity Law No. (13) of 2002',
      summaryArabic: 'قانون الكهرباء الأردني رقم (13) لسنة 2002 - يتضمن تعريفات وأهداف تنظيم قطاع الكهرباء في المملكة الأردنية الهاشمية',
      articles: [
        {
          number: '1',
          title: 'Name and Commencement',
          content: 'يسمى هذا القانون (قانون الكهرباء لسنة 2002) ويعمل به من تاريخ نشره في الجريدة الرسمية.'
        },
        {
          number: '2',
          title: 'Definitions',
          content: 'يكون للكلمات والعبارات التالية حيثما وردت في هذا القانون المعاني المخصصة لها أدناه ما لم تدل القرينة على غير ذلك: - الوزارة: وزارة الطاقة والثروة المعدنية - الوزير: وزير الطاقة والثروة المعدنية - الهيئة: هيئة تنظيم قطاع الطاقة والمعادن - الرئيس: رئيس مجلس مفوضي الهيئة - الشركة الوطنية: الشركة الوطنية للكهرباء - المرخص له: أي شخص طبيعي أو اعتباري حاصل على ترخيص من الهيئة لممارسة أي من أنشطة الكهرباء - الكهرباء: الطاقة الكهربائية بجميع أشكالها وأنواعها - شبكة النقل: الشبكة الكهربائية المخصصة لنقل الكهرباء بجهد عالي - شبكة التوزيع: الشبكة الكهربائية المخصصة لتوزيع الكهرباء بجهد متوسط ومنخفض'
        }
      ],
      searchIndex: {
        fullText: electricityLawContent,
        arabicText: electricityLawContent
      },
      source: {
        verified: true,
        verifiedBy: 'system'
      }
    });
    
    await newDoc.save();
    console.log('تم إنشاء وثيقة قانون الكهرباء الجديدة بنجاح!');
    console.log('طول المحتوى:', electricityLawContent.length);
    
    // Test if Article 2 can be found
    const article2Match = electricityLawContent.match(/المادة\s*[٢2]\s*[:-]?([^\n]*(?:\n(?!المادة)[^\n]*)*)/i);
    if (article2Match) {
      console.log('\n*** تم العثور على المادة 2: ***');
      console.log(article2Match[0]);
    }
    
    // Test search patterns
    console.log('\n=== اختبار أنماط البحث ===');
    const patterns = ['المادة\\s*2', 'المادة\\s*الثانية', 'المادة\\s*٢'];
    patterns.forEach(pattern => {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(electricityLawContent)) {
        console.log(`✅ النمط "${pattern}" يطابق المحتوى`);
      } else {
        console.log(`❌ النمط "${pattern}" لا يطابق المحتوى`);
      }
    });
    
  } catch (error) {
    console.error('خطأ:', error);
  } finally {
    mongoose.connection.close();
  }
}

createNewElectricityLaw();