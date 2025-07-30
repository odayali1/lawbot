# Criminal Law Articles Upload Guide

## Current Status
- **Total Criminal Law Documents**: 3
- **Total Articles Available**: Only 4 articles (1, 2, 9, 10)
- **Missing Articles**: 432+ articles (3-8, 11-436+)
- **Target**: Complete Jordanian Penal Code with 436+ articles

## Optimal Data Structure for Training

### 1. JSON Format (Recommended)
```json
{
  "title": "Jordanian Penal Code",
  "titleArabic": "قانون العقوبات الأردني لسنة 1960",
  "type": "criminal_code",
  "category": "Criminal Law",
  "officialNumber": "قانون رقم 16 لسنة 1960",
  "publicationDate": "1960-05-01",
  "effectiveDate": "1960-05-01",
  "status": "active",
  "articles": [
    {
      "number": "3",
      "title": "عنوان المادة الثالثة",
      "content": "نص المادة الثالثة كاملاً...",
      "subsections": [
        {
          "number": "1",
          "content": "الفقرة الأولى من المادة"
        },
        {
          "number": "2",
          "content": "الفقرة الثانية من المادة"
        }
      ],
      "keywords": ["كلمة مفتاحية1", "كلمة مفتاحية2"],
      "relatedArticles": ["1", "2", "4"]
    }
  ],
  "keywords": [
    {
      "term": "criminal law",
      "termArabic": "قانون العقوبات",
      "weight": 0.9
    }
  ]
}
```

### 2. CSV Format (Alternative)
```csv
ArticleNumber,Title,Content,Subsections,Keywords,RelatedArticles
3,"عنوان المادة الثالثة","نص المادة كاملاً...","1:الفقرة الأولى|2:الفقرة الثانية","كلمة1,كلمة2","1,2,4"
4,"عنوان المادة الرابعة","نص المادة كاملاً...","","كلمة3,كلمة4","2,3,5"
```

### 3. Markdown Format (Human-Readable)
```markdown
## المادة 3: عنوان المادة الثالثة

نص المادة الثالثة كاملاً...

### الفقرات:
1. الفقرة الأولى من المادة
2. الفقرة الثانية من المادة

**الكلمات المفتاحية**: كلمة مفتاحية1, كلمة مفتاحية2
**المواد ذات الصلة**: 1, 2, 4

---

## المادة 4: عنوان المادة الرابعة
...
```

## Database Schema Structure

### Article Schema
```javascript
{
  number: String,        // "3", "4", etc.
  title: String,         // عنوان المادة
  content: String,       // النص الكامل للمادة
  subsections: [{
    number: String,      // "1", "2", etc.
    content: String      // نص الفقرة
  }],
  keywords: [String],    // الكلمات المفتاحية
  relatedArticles: [String] // أرقام المواد ذات الصلة
}
```

### Document Schema
```javascript
{
  title: String,           // English title
  titleArabic: String,     // العنوان العربي
  type: "criminal_code",   // نوع الوثيقة
  category: "Criminal Law", // التصنيف
  officialNumber: String,  // الرقم الرسمي
  publicationDate: Date,   // تاريخ النشر
  effectiveDate: Date,     // تاريخ النفاذ
  status: "active",        // الحالة
  articles: [ArticleSchema], // المواد
  keywords: [{
    term: String,          // English term
    termArabic: String,    // المصطلح العربي
    weight: Number         // الوزن (0-1)
  }]
}
```

## Best Practices for Upload

### 1. Data Quality
- **Complete Articles**: Include all 436+ articles
- **Accurate Numbering**: Sequential numbering (1, 2, 3, ...)
- **Rich Content**: Full text, not summaries
- **Proper Arabic**: Correct Arabic text encoding

### 2. Structure Requirements
- **Consistent Format**: Same structure for all articles
- **Subsections**: Break down complex articles
- **Keywords**: 3-10 relevant keywords per article
- **Cross-References**: Link related articles

### 3. Upload Methods

#### Method 1: Bulk JSON Upload
```javascript
// Create upload script
const articles = require('./complete_penal_code.json');
const doc = new LegalDocument(articles);
await doc.save();
```

#### Method 2: CSV Import
```javascript
// Parse CSV and convert to articles
const csv = require('csv-parser');
const articles = [];
fs.createReadStream('penal_code.csv')
  .pipe(csv())
  .on('data', (row) => {
    articles.push({
      number: row.ArticleNumber,
      title: row.Title,
      content: row.Content,
      // ... process other fields
    });
  });
```

#### Method 3: API Upload
```javascript
// Use existing document upload API
POST /api/documents/upload
Content-Type: multipart/form-data

// With file containing structured data
```

## Training Optimization

### 1. Search Index
- **Full Text**: Concatenated searchable content
- **Arabic Text**: Separate Arabic search index
- **Keywords**: Weighted keyword matching

### 2. Performance
- **Indexing**: MongoDB indexes on article numbers
- **Caching**: Frequently accessed articles
- **Chunking**: Large articles split into sections

### 3. AI Training
- **Context**: Include related articles in responses
- **Relevance**: Weight articles by query match
- **Completeness**: Ensure all 436+ articles are available

## Missing Articles Analysis

Currently missing **432+ articles** (3-8, 11-436+):
- **Articles 3-8**: Basic definitions and principles
- **Articles 11-100**: General provisions
- **Articles 101-200**: Crimes against persons
- **Articles 201-300**: Crimes against property
- **Articles 301-400**: Crimes against public order
- **Articles 401-436+**: Penalties and procedures

## Recommended Upload Priority

1. **High Priority** (Articles 3-50): Core definitions and principles
2. **Medium Priority** (Articles 51-200): Major crime categories
3. **Standard Priority** (Articles 201-436+): Specific crimes and penalties

## Quality Assurance

- **Validation**: Check article numbering sequence
- **Content Review**: Verify Arabic text accuracy
- **Cross-Reference**: Ensure related articles exist
- **Testing**: Verify search and retrieval functionality