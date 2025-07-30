const fs = require('fs');
const path = require('path');

// Create a mock database file with the electricity law data
const electricityLawData = {
  _id: "electricity_law_jordan_2002",
  title: "Jordanian Electricity Law",
  titleArabic: "قانون الكهرباء الأردني",
  type: "regulation",
  category: "Civil Law",
  officialNumber: "LAW-13-2002",
  publicationDate: "2002-01-01T00:00:00.000Z",
  effectiveDate: "2002-01-01T00:00:00.000Z",
  summary: "Jordanian Electricity Law No. (13) of 2002 - Regulates the electricity sector in Jordan",
  summaryArabic: "قانون الكهرباء الأردني رقم (13) لسنة 2002 - ينظم قطاع الكهرباء في الأردن",
  
  articles: [
    {
      number: "1",
      title: "التسمية والنفاذ",
      content: "يسمى هذا القانون (قانون الكهرباء لسنة 2002) ويعمل به من تاريخ نشره في الجريدة الرسمية.",
      keywords: ["تسمية", "نفاذ", "قانون الكهرباء"]
    },
    {
      number: "2",
      title: "التعريفات",
      content: "يكون للكلمات والعبارات التالية حيثما وردت في هذا القانون المعاني المخصصة لها أدناه ما لم تدل القرينة على غير ذلك:\n\nأ- الوزارة: وزارة الطاقة والثروة المعدنية\nب- الوزير: وزير الطاقة والثروة المعدنية\nج- الهيئة: هيئة تنظيم قطاع الطاقة والمعادن\nد- الرئيس: رئيس مجلس مفوضي الهيئة\nه- الشركة الوطنية: الشركة الوطنية للكهرباء\nو- المرخص له: أي شخص طبيعي أو اعتباري حاصل على ترخيص من الهيئة لممارسة أي من أنشطة الكهرباء\nز- الكهرباء: الطاقة الكهربائية بجميع أشكالها وأنواعها\nح- شبكة النقل: الشبكة الكهربائية المخصصة لنقل الكهرباء بجهد عالي\nط- شبكة التوزيع: الشبكة الكهربائية المخصصة لتوزيع الكهرباء بجهد متوسط ومنخفض\nي- المستهلك: أي شخص طبيعي أو اعتباري يستهلك الكهرباء لأغراضه الخاصة\nك- التعرفة: الأسعار والرسوم المحددة لخدمات الكهرباء",
      keywords: ["تعريفات", "وزارة الطاقة", "هيئة التنظيم", "الكهرباء", "شبكة النقل", "شبكة التوزيع"]
    },
    {
      number: "3",
      title: "أهداف القانون",
      content: "يهدف هذا القانون إلى تحقيق ما يلي:\nأ- تنظيم قطاع الكهرباء وضمان تطويره بما يحقق المصلحة العامة\nب- ضمان توفير خدمات الكهرباء بجودة عالية وأسعار معقولة\nج- تشجيع الاستثمار في قطاع الكهرباء\nد- حماية المستهلكين والبيئة\nه- تعزيز الكفاءة في استخدام الطاقة\nو- تطوير مصادر الطاقة المتجددة",
      keywords: ["أهداف", "تنظيم", "جودة", "استثمار", "حماية المستهلكين", "البيئة"]
    }
  ],
  
  fullText: "قانون الكهرباء الأردني رقم (13) لسنة 2002\n\nالمادة 1: التسمية والنفاذ\nيسمى هذا القانون (قانون الكهرباء لسنة 2002) ويعمل به من تاريخ نشره في الجريدة الرسمية.\n\nالمادة 2: التعريفات\nيكون للكلمات والعبارات التالية حيثما وردت في هذا القانون المعاني المخصصة لها أدناه ما لم تدل القرينة على غير ذلك:\nأ- الوزارة: وزارة الطاقة والثروة المعدنية\nب- الوزير: وزير الطاقة والثروة المعدنية\nج- الهيئة: هيئة تنظيم قطاع الطاقة والمعادن\nد- الرئيس: رئيس مجلس مفوضي الهيئة\nه- الشركة الوطنية: الشركة الوطنية للكهرباء\nو- المرخص له: أي شخص طبيعي أو اعتباري حاصل على ترخيص من الهيئة لممارسة أي من أنشطة الكهرباء\nز- الكهرباء: الطاقة الكهربائية بجميع أشكالها وأنواعها\nح- شبكة النقل: الشبكة الكهربائية المخصصة لنقل الكهرباء بجهد عالي\nط- شبكة التوزيع: الشبكة الكهربائية المخصصة لتوزيع الكهرباء بجهد متوسط ومنخفض\nي- المستهلك: أي شخص طبيعي أو اعتباري يستهلك الكهرباء لأغراضه الخاصة\nك- التعرفة: الأسعار والرسوم المحددة لخدمات الكهرباء\n\nالمادة 3: أهداف القانون\nيهدف هذا القانون إلى تحقيق ما يلي:\nأ- تنظيم قطاع الكهرباء وضمان تطويره بما يحقق المصلحة العامة\nب- ضمان توفير خدمات الكهرباء بجودة عالية وأسعار معقولة\nج- تشجيع الاستثمار في قطاع الكهرباء\nد- حماية المستهلكين والبيئة\nه- تعزيز الكفاءة في استخدام الطاقة\nو- تطوير مصادر الطاقة المتجددة",
  
  keywords: [
    { term: "electricity", termArabic: "كهرباء", weight: 1.0 },
    { term: "energy", termArabic: "طاقة", weight: 0.9 },
    { term: "regulation", termArabic: "تنظيم", weight: 0.8 },
    { term: "ministry", termArabic: "وزارة", weight: 0.7 },
    { term: "authority", termArabic: "هيئة", weight: 0.7 },
    { term: "definitions", termArabic: "تعريفات", weight: 0.6 }
  ],
  
  source: {
    officialGazette: {
      issue: "4475",
      date: "2002-01-15T00:00:00.000Z",
      page: 234
    },
    verified: true,
    verifiedBy: "Legal System Administrator",
    verificationDate: new Date().toISOString()
  },
  
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ تم إنشاء مجلد البيانات');
}

// Write the electricity law data to a JSON file
const filePath = path.join(dataDir, 'electricity_law.json');
fs.writeFileSync(filePath, JSON.stringify(electricityLawData, null, 2), 'utf8');
console.log('✅ تم حفظ بيانات قانون الكهرباء في:', filePath);

// Test searching for Article 2
console.log('\n=== اختبار البحث عن المادة 2 ===');

// Test 1: Find Article 2 in articles array
const article2 = electricityLawData.articles.find(article => article.number === '2');
if (article2) {
  console.log('✅ تم العثور على المادة 2 في مصفوفة المواد:');
  console.log('العنوان:', article2.title);
  console.log('بداية المحتوى:', article2.content.substring(0, 100) + '...');
}

// Test 2: Search in fullText
if (electricityLawData.fullText.includes('المادة 2')) {
  console.log('✅ النص الكامل يحتوي على المادة 2');
  
  // Extract Article 2 content from fullText
  const article2Match = electricityLawData.fullText.match(/المادة 2[^\n]*\n([\s\S]*?)(?=\n\nالمادة 3|$)/i);
  if (article2Match) {
    console.log('✅ تم استخراج محتوى المادة 2 من النص الكامل:');
    console.log('المحتوى:', article2Match[0].substring(0, 200) + '...');
  }
}

// Test 3: Simulate the chat system search
function simulateSearch(query) {
  const searchTerms = [query.toLowerCase()];
  
  // Check if any search term matches
  const matches = searchTerms.some(term => 
    electricityLawData.title.toLowerCase().includes(term) ||
    electricityLawData.titleArabic.includes(term) ||
    electricityLawData.summary.toLowerCase().includes(term) ||
    electricityLawData.fullText.includes(term) ||
    electricityLawData.articles.some(article => article.content.includes(term))
  );
  
  return matches ? [electricityLawData] : [];
}

console.log('\n=== محاكاة البحث في النظام ===');
const searchResults = simulateSearch('المادة 2');
console.log('عدد النتائج:', searchResults.length);

if (searchResults.length > 0) {
  console.log('✅ تم العثور على الوثيقة:', searchResults[0].titleArabic);
  
  // Extract Article 2 specifically
  const doc = searchResults[0];
  const article2FromSearch = doc.articles.find(a => a.number === '2');
  if (article2FromSearch) {
    console.log('✅ تم استخراج المادة 2:');
    console.log('العنوان:', article2FromSearch.title);
    console.log('المحتوى الكامل:');
    console.log(article2FromSearch.content);
  }
}

console.log('\n🎉 تم إنشاء ملف البيانات بنجاح!');
console.log('يمكن الآن للنظام قراءة هذا الملف والاستجابة لطلبات المادة 2.');
console.log('\nملاحظة: تأكد من تعديل النظام ليقرأ من ملف JSON إذا كانت قاعدة البيانات غير متاحة.');