const mongoose = require('mongoose');
const LegalDocument = require('./models/LegalDocument');

// Simple search function without complex regex patterns
const simpleSearchLegalDocuments = async (query, category = null) => {
  try {
    console.log('Starting simple search for:', query);
    
    let documents = [];
    
    // First try: Simple text search in key fields
    try {
      const searchQuery = {
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { titleArabic: { $regex: query, $options: 'i' } },
          { summary: { $regex: query, $options: 'i' } },
          { 'articles.content': { $regex: query, $options: 'i' } },
          { 'articles.title': { $regex: query, $options: 'i' } }
        ]
      };

      if (category) {
        searchQuery.category = category;
      }

      documents = await LegalDocument.find(searchQuery)
        .select('title titleArabic type category articles officialNumber summary fullText')
        .limit(5);
        
      console.log('Simple search results:', documents.length);
      
    } catch (error) {
      console.log('Simple search failed:', error.message);
    }
    
    // Second try: Search for electricity law specifically
    if (documents.length === 0 && query.includes('كهرباء')) {
      try {
        const electricityQuery = {
          $or: [
            { titleArabic: { $regex: 'كهرباء', $options: 'i' } },
            { title: { $regex: 'electricity', $options: 'i' } },
            { summary: { $regex: 'كهرباء', $options: 'i' } }
          ]
        };
        
        documents = await LegalDocument.find(electricityQuery)
          .select('title titleArabic type category articles officialNumber summary fullText')
          .limit(5);
          
        console.log('Electricity law search results:', documents.length);
        
      } catch (error) {
        console.log('Electricity search failed:', error.message);
      }
    }
    
    // Third try: Search for article 2 content specifically
    if (documents.length === 0 && (query.includes('المادة 2') || query.includes('المادة الثانية'))) {
      try {
        const article2Query = {
          $or: [
            { 'articles.content': { $regex: 'تعريفات', $options: 'i' } },
            { 'articles.title': { $regex: 'تعريفات', $options: 'i' } },
            { 'articles.content': { $regex: 'يكون للكلمات', $options: 'i' } }
          ]
        };
        
        documents = await LegalDocument.find(article2Query)
          .select('title titleArabic type category articles officialNumber summary fullText')
          .limit(5);
          
        console.log('Article 2 content search results:', documents.length);
        
      } catch (error) {
        console.log('Article 2 search failed:', error.message);
      }
    }
    
    console.log('Final search results:', {
      query: query.substring(0, 50),
      documentsFound: documents.length,
      documentTitles: documents.map(doc => doc.title || doc.titleArabic)
    });
    
    return documents;
    
  } catch (error) {
    console.error('Search error:', error.message);
    return [];
  }
};

module.exports = { simpleSearchLegalDocuments };