const mongoose = require('mongoose');
const LegalDocument = require('./models/LegalDocument');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lawbot', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function addSampleContent() {
  try {
    console.log('=== إضافة محتوى تجريبي لقانون الكهرباء ===\n');
    
    // Sample content for Jordanian Electricity Law with Article 2
    const electricityLawContent = `
قانون الكهرباء الأردني رقم (13) لسنة 2002

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
تنشأ بموجب أحكام هذا القانون هيئة مستقلة تسمى (هيئة تنظيم قطاع الطاقة والمعادن) تتمتع بالشخصية الاعتبارية والاستقلال المالي والإداري.
`;
    
    // Update the existing electricity law document
    const result = await LegalDocument.updateOne(
      { title: 'قانون الكهرباء' },
      { 
        $set: { 
          content: electricityLawContent,
          summary: 'قانون الكهرباء الأردني رقم (13) لسنة 2002 - يتضمن تعريفات وأهداف تنظيم قطاع الكهرباء في المملكة الأردنية الهاشمية',
          tags: ['كهرباء', 'طاقة', 'تنظيم', 'أردن', 'قانون']
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log('تم تحديث وثيقة قانون الكهرباء بنجاح!');
      
      // Verify the update
      const updatedDoc = await LegalDocument.findOne({ title: 'قانون الكهرباء' }).lean();
      console.log('طول المحتوى الجديد:', updatedDoc.content.length);
      
      // Test if Article 2 can be found
      const article2Match = updatedDoc.content.match(/المادة\s*[٢2]\s*[:-]?([^\n]*(?:\n(?!المادة)[^\n]*)*)/i);
      if (article2Match) {
        console.log('\n*** تم العثور على المادة 2: ***');
        console.log(article2Match[0]);
      }
    } else {
      console.log('لم يتم العثور على وثيقة قانون الكهرباء للتحديث');
    }
    
  } catch (error) {
    console.error('خطأ:', error);
  } finally {
    mongoose.connection.close();
  }
}

addSampleContent();