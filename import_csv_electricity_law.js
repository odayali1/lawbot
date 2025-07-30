const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const LegalDocument = require('./models/LegalDocument');

// Connect to the memory database
const connectToMemoryDB = async () => {
  try {
    // Get the current MongoDB URI from environment
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:54158';
    console.log('Connecting to MongoDB at:', mongoUri);
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const importCSVData = async () => {
  try {
    await connectToMemoryDB();
    
    // Clear existing documents
    await LegalDocument.deleteMany({});
    console.log('Cleared existing documents');
    
    const articles = [];
    const csvFilePath = './uploads/documents/ai_studio_code (3) - ai_studio_code (3) (1).csv';
    
    // Read and parse CSV file
    const csvData = await new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => {
          results.push(data);
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
    
    console.log(`Found ${csvData.length} rows in CSV file`);
    
    // Process each row
    csvData.forEach((row, index) => {
      const articleNumber = row.Article_Number;
      const title = row.Title;
      const content = row.Full_Article_Text;
      
      if (content && content.trim()) {
        articles.push({
          number: articleNumber.toString(),
          title: title || `المادة ${articleNumber}`,
          content: content.trim()
        });
      }
    });
    
    console.log(`Processed ${articles.length} articles`);
    
    // Create the legal document
    const electricityLaw = new LegalDocument({
      title: 'Electricity Law',
      titleArabic: 'قانون الكهرباء العام رقم (١٠) لسنة ٢٠٢٥',
      summary: 'قانون الكهرباء العام الأردني لسنة ٢٠٢٥ الذي ينظم قطاع الطاقة الكهربائية في المملكة الأردنية الهاشمية',
      summaryArabic: 'قانون الكهرباء العام الأردني لسنة ٢٠٢٥ الذي ينظم قطاع الطاقة الكهربائية في المملكة الأردنية الهاشمية',
      type: 'other',
      category: 'Administrative Law',
      officialNumber: 'Law No. 10 of 2025',
      publicationDate: new Date('2025-01-01'),
      effectiveDate: new Date('2025-04-01'),
      status: 'active',
      articles: articles,
      metadata: {
        tags: ['electricity', 'energy', 'Jordan'],
        confidence: 0.9
      }
    });
    
    await electricityLaw.save();
    console.log('Successfully imported electricity law with', articles.length, 'articles');
    
    // Verify import
    const savedDoc = await LegalDocument.findOne({ titleArabic: 'قانون الكهرباء العام رقم (١٠) لسنة ٢٠٢٥' });
    if (savedDoc) {
      console.log('Verification: Document saved successfully');
      console.log('Document ID:', savedDoc._id);
      console.log('Total articles in saved document:', savedDoc.articles.length);
      
      // Test search for specific articles
      const article40 = savedDoc.articles.find(art => art.number === 40);
      if (article40) {
        console.log('Found Article 40:', article40.title);
      } else {
        console.log('Article 40 not found');
      }
    }
    
  } catch (error) {
    console.error('Error importing CSV data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the import
importCSVData();