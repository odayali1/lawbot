const mongoose = require('mongoose');
const LegalDocument = require('./models/LegalDocument');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function parseElectricityLaw(content) {
  const articles = [];
  
  // Split content by article markers
  const articleMatches = content.match(/##\s*المادة\s*[٠-٩0-9]+[^#]*?(?=##\s*المادة|$)/g);
  
  if (articleMatches) {
    for (const match of articleMatches) {
      // Extract article number
      const numberMatch = match.match(/##\s*المادة\s*([٠-٩0-9]+)/);
      if (numberMatch) {
        const arabicNumber = numberMatch[1];
        // Convert Arabic numerals to English
        const englishNumber = arabicNumber
          .replace(/٠/g, '0')
          .replace(/١/g, '1')
          .replace(/٢/g, '2')
          .replace(/٣/g, '3')
          .replace(/٤/g, '4')
          .replace(/٥/g, '5')
          .replace(/٦/g, '6')
          .replace(/٧/g, '7')
          .replace(/٨/g, '8')
          .replace(/٩/g, '9');
        
        // Extract title (text after article number and before content)
        const titleMatch = match.match(/##\s*المادة\s*[٠-٩0-9]+:\s*([^\n]+)/);
        const title = titleMatch ? titleMatch[1].trim() : `المادة ${arabicNumber}`;
        
        // Extract content (everything after the title)
        const contentMatch = match.match(/##\s*المادة\s*[٠-٩0-9]+[^\n]*\n([\s\S]*?)$/);
        const content = contentMatch ? contentMatch[1].trim() : '';
        
        articles.push({
          number: englishNumber,
          title: title,
          content: content,
          subsections: [],
          keywords: [],
          relatedArticles: []
        });
      }
    }
  }
  
  return articles;
}

async function importUploadedDocuments() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lawbot';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const uploadsDir = path.join(__dirname, 'uploads', 'documents');
    
    // Read the electricity law markdown file
    const electricityLawPath = path.join(uploadsDir, 'قانون الكهرباء.md');
    
    try {
      const content = await fs.readFile(electricityLawPath, 'utf8');
      console.log('Reading electricity law document...');
      
      // Parse articles from the content
      const articles = await parseElectricityLaw(content);
      console.log(`Parsed ${articles.length} articles`);
      
      // Check if Article 27 exists
      const article27 = articles.find(art => art.number === '27');
      if (article27) {
        console.log('✅ Found Article 27:', article27.title);
        console.log('Content preview:', article27.content.substring(0, 200) + '...');
      } else {
        console.log('❌ Article 27 not found in parsed articles');
      }
      
      // Delete existing electricity law documents
      const deleteResult = await LegalDocument.deleteMany({
        $or: [
          { titleArabic: { $regex: /كهرباء/i } },
          { title: { $regex: /electricity/i } },
          { officialNumber: { $regex: /10.*202[0-9]/i } }
        ]
      });
      console.log(`Deleted ${deleteResult.deletedCount} existing electricity law documents`);
      
      // Create new document
      const electricityLaw = new LegalDocument({
        title: 'Jordanian Electricity Law',
        titleArabic: 'قانون الكهرباء العام رقم (١٠) لسنة ٢٠٢٥',
        type: 'other',
        category: 'Administrative Law',
        officialNumber: 'رقم 10 لسنة 2025',
        publicationDate: new Date('2025-01-01'),
        effectiveDate: new Date('2025-01-01'),
        status: 'active',

        summary: 'قانون ينظم قطاع الكهرباء في المملكة الأردنية الهاشمية ويحدد التعريفات والأحكام الخاصة بتوليد ونقل وتوزيع الطاقة الكهربائية',
        articles: articles,
        searchIndex: {
          fullText: content,
          arabicText: content,
          lastIndexed: new Date()
        },
        keywords: [
          { term: 'electricity', termArabic: 'كهرباء', weight: 1.0 },
          { term: 'law', termArabic: 'قانون', weight: 1.0 },
          { term: 'jordan', termArabic: 'الأردن', weight: 0.8 },
          { term: 'article', termArabic: 'مادة', weight: 0.6 }
        ],
        metadata: {
          confidence: 0.9
        }
      });
      
      await electricityLaw.save();
      console.log('✅ Successfully imported electricity law into database');
      
      // Verify Article 27 is accessible
      const savedDoc = await LegalDocument.findOne({ titleArabic: /كهرباء/ });
      if (savedDoc) {
        const article27Saved = savedDoc.articles.find(art => art.number === '27');
        if (article27Saved) {
          console.log('✅ Verified: Article 27 is now in the database');
          console.log('Article 27 title:', article27Saved.title);
        } else {
          console.log('❌ Article 27 not found in saved document');
        }
      }
      
    } catch (fileError) {
      console.error('Error reading electricity law file:', fileError.message);
    }
    
  } catch (error) {
    console.error('Error importing documents:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the import
importUploadedDocuments();