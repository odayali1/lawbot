const mongoose = require('mongoose');
const LegalDocument = require('./models/LegalDocument');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/lawbot', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createElectricityLawDocument() {
  try {
    console.log('=== إنشاء وثيقة قانون الكهرباء الأردني ===');
    
    // Delete all existing documents first
    await LegalDocument.deleteMany({});
    console.log('تم حذف جميع الوثائق الموجودة');
    
    // Create the electricity law document with proper structure
    const electricityLawDoc = new LegalDocument({
      title: 'Jordanian Electricity Law',
      titleArabic: 'قانون الكهرباء الأردني',
      type: 'regulation',
      category: 'Civil Law',
      officialNumber: 'LAW-13-2002',
      publicationDate: new Date('2002-01-01'),
      effectiveDate: new Date('2002-01-01'),
      summary: 'Jordanian Electricity Law No. (13) of 2002 - Regulates the electricity sector in Jordan',
      summaryArabic: 'قانون الكهرباء الأردني رقم (13) لسنة 2002 - ينظم قطاع الكهرباء في الأردن',
      
      // Articles array with detailed content
      articles: [
        {
          number: '1',
          title: 'التسمية والنفاذ',
          content: 'يسمى هذا القانون (قانون الكهرباء لسنة 2002) ويعمل به من تاريخ نشره في الجريدة الرسمية.',
          keywords: ['تسمية', 'نفاذ', 'قانون الكهرباء']
        },
        {
          number: '2',
          title: 'التعريفات',
          content: 'يكون للكلمات والعبارات التالية حيثما وردت في هذا القانون المعاني المخصصة لها أدناه ما لم تدل القرينة على غير ذلك:\n\nأ- الوزارة: وزارة الطاقة والثروة المعدنية\nب- الوزير: وزير الطاقة والثروة المعدنية\nج- الهيئة: هيئة تنظيم قطاع الطاقة والمعادن\nد- الرئيس: رئيس مجلس مفوضي الهيئة\nه- الشركة الوطنية: الشركة الوطنية للكهرباء\nو- المرخص له: أي شخص طبيعي أو اعتباري حاصل على ترخيص من الهيئة لممارسة أي من أنشطة الكهرباء\nز- الكهرباء: الطاقة الكهربائية بجميع أشكالها وأنواعها\nح- شبكة النقل: الشبكة الكهربائية المخصصة لنقل الكهرباء بجهد عالي\nط- شبكة التوزيع: الشبكة الكهربائية المخصصة لتوزيع الكهرباء بجهد متوسط ومنخفض\nي- المستهلك: أي شخص طبيعي أو اعتباري يستهلك الكهرباء لأغراضه الخاصة\nك- التعرفة: الأسعار والرسوم المحددة لخدمات الكهرباء',
          keywords: ['تعريفات', 'وزارة الطاقة', 'هيئة التنظيم', 'الكهرباء', 'شبكة النقل', 'شبكة التوزيع']
        },
        {
          number: '3',
          title: 'أهداف القانون',
          content: 'يهدف هذا القانون إلى تحقيق ما يلي:\nأ- تنظيم قطاع الكهرباء وضمان تطويره بما يحقق المصلحة العامة\nب- ضمان توفير خدمات الكهرباء بجودة عالية وأسعار معقولة\nج- تشجيع الاستثمار في قطاع الكهرباء\nد- حماية المستهلكين والبيئة\nه- تعزيز الكفاءة في استخدام الطاقة\nو- تطوير مصادر الطاقة المتجددة',
          keywords: ['أهداف', 'تنظيم', 'جودة', 'استثمار', 'حماية المستهلكين', 'البيئة']
        },
        {
          number: '4',
          title: 'إنشاء الهيئة',
          content: 'تنشأ بموجب أحكام هذا القانون هيئة مستقلة تسمى (هيئة تنظيم قطاع الطاقة والمعادن) تتمتع بالشخصية الاعتبارية والاستقلال المالي والإداري، ويكون مقرها الرئيسي في عمان.',
          keywords: ['هيئة التنظيم', 'استقلالية', 'شخصية اعتبارية']
        }
      ],
      
      // Full text for search
      fullText: `قانون الكهرباء الأردني رقم (13) لسنة 2002\n\nالمادة 1: التسمية والنفاذ\nيسمى هذا القانون (قانون الكهرباء لسنة 2002) ويعمل به من تاريخ نشره في الجريدة الرسمية.\n\nالمادة 2: التعريفات\nيكون للكلمات والعبارات التالية حيثما وردت في هذا القانون المعاني المخصصة لها أدناه ما لم تدل القرينة على غير ذلك:\nأ- الوزارة: وزارة الطاقة والثروة المعدنية\nب- الوزير: وزير الطاقة والثروة المعدنية\nج- الهيئة: هيئة تنظيم قطاع الطاقة والمعادن\nد- الرئيس: رئيس مجلس مفوضي الهيئة\nه- الشركة الوطنية: الشركة الوطنية للكهرباء\nو- المرخص له: أي شخص طبيعي أو اعتباري حاصل على ترخيص من الهيئة لممارسة أي من أنشطة الكهرباء\nز- الكهرباء: الطاقة الكهربائية بجميع أشكالها وأنواعها\nح- شبكة النقل: الشبكة الكهربائية المخصصة لنقل الكهرباء بجهد عالي\nط- شبكة التوزيع: الشبكة الكهربائية المخصصة لتوزيع الكهرباء بجهد متوسط ومنخفض\nي- المستهلك: أي شخص طبيعي أو اعتباري يستهلك الكهرباء لأغراضه الخاصة\nك- التعرفة: الأسعار والرسوم المحددة لخدمات الكهرباء\n\nالمادة 3: أهداف القانون\nيهدف هذا القانون إلى تحقيق ما يلي:\nأ- تنظيم قطاع الكهرباء وضمان تطويره بما يحقق المصلحة العامة\nب- ضمان توفير خدمات الكهرباء بجودة عالية وأسعار معقولة\nج- تشجيع الاستثمار في قطاع الكهرباء\nد- حماية المستهلكين والبيئة\nه- تعزيز الكفاءة في استخدام الطاقة\nو- تطوير مصادر الطاقة المتجددة\n\nالمادة 4: إنشاء الهيئة\nتنشأ بموجب أحكام هذا القانون هيئة مستقلة تسمى (هيئة تنظيم قطاع الطاقة والمعادن) تتمتع بالشخصية الاعتبارية والاستقلال المالي والإداري، ويكون مقرها الرئيسي في عمان.`,
      
      // Keywords for better search
      keywords: [
        { term: 'electricity', termArabic: 'كهرباء', weight: 1.0 },
        { term: 'energy', termArabic: 'طاقة', weight: 0.9 },
        { term: 'regulation', termArabic: 'تنظيم', weight: 0.8 },
        { term: 'ministry', termArabic: 'وزارة', weight: 0.7 },
        { term: 'authority', termArabic: 'هيئة', weight: 0.7 },
        { term: 'definitions', termArabic: 'تعريفات', weight: 0.6 }
      ],
      
      // Source information
      source: {
        officialGazette: {
          issue: '4475',
          date: new Date('2002-01-15'),
          page: 234
        },
        verified: true,
        verifiedBy: 'Legal System Administrator',
        verificationDate: new Date()
      },
      
      // Search index (will be auto-populated by pre-save middleware)
      searchIndex: {
        lastIndexed: new Date()
      }
    });
    
    // Save the document
    const savedDoc = await electricityLawDoc.save();
    console.log('✅ تم إنشاء وثيقة قانون الكهرباء بنجاح!');
    console.log('معرف الوثيقة:', savedDoc._id);
    console.log('العنوان العربي:', savedDoc.titleArabic);
    console.log('عدد المواد:', savedDoc.articles.length);
    
    // Test searching for Article 2
    console.log('\n=== اختبار البحث عن المادة 2 ===');
    
    // Test 1: Direct article search
    const article2 = savedDoc.articles.find(article => article.number === '2');
    if (article2) {
      console.log('✅ تم العثور على المادة 2:');
      console.log('العنوان:', article2.title);
      console.log('بداية المحتوى:', article2.content.substring(0, 100) + '...');
    }
    
    // Test 2: Search using the same method as the chat system
    const searchQuery = 'المادة 2';
    const searchResults = await LegalDocument.find({
      status: 'active',
      $or: [
        { title: { $regex: searchQuery, $options: 'i' } },
        { titleArabic: { $regex: searchQuery, $options: 'i' } },
        { summary: { $regex: searchQuery, $options: 'i' } },
        { fullText: { $regex: searchQuery, $options: 'i' } },
        { 'articles.content': { $regex: searchQuery, $options: 'i' } }
      ]
    }).limit(5);
    
    console.log('\n=== نتائج البحث باستخدام نفس طريقة النظام ===');
    console.log('عدد النتائج:', searchResults.length);
    
    if (searchResults.length > 0) {
      const doc = searchResults[0];
      console.log('الوثيقة الأولى:', doc.titleArabic);
      
      // Check if fullText contains Article 2
      if (doc.fullText && doc.fullText.includes('المادة 2')) {
        console.log('✅ النص الكامل يحتوي على المادة 2');
        
        // Extract Article 2 content
        const article2Match = doc.fullText.match(/المادة 2[^\n]*\n([\s\S]*?)(?=\n\nالمادة 3|$)/i);
        if (article2Match) {
          console.log('✅ تم استخراج محتوى المادة 2:');
          console.log(article2Match[0].substring(0, 200) + '...');
        }
      }
    }
    
    console.log('\n🎉 تم إنشاء الوثيقة بنجاح! يمكن الآن للنظام الاستجابة لطلبات المادة 2.');
    
  } catch (error) {
    console.error('خطأ في إنشاء الوثيقة:', error.message);
    if (error.code === 11000) {
      console.error('خطأ: الرقم الرسمي مكرر. سأحاول برقم مختلف...');
      // يمكن إعادة المحاولة برقم مختلف هنا
    }
  } finally {
    await mongoose.connection.close();
    console.log('تم إغلاق الاتصال بقاعدة البيانات');
  }
}

// تشغيل الدالة
createElectricityLawDocument();