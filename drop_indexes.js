const mongoose = require('mongoose');
require('dotenv').config();

async function dropIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lawbot');
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('legaldocuments');
    
    // Drop all indexes except _id
    try {
      await collection.dropIndexes();
      console.log('✅ تم حذف جميع الفهارس');
    } catch (error) {
      console.log('معلومات:', error.message);
    }
    
    // List remaining indexes
    const indexes = await collection.listIndexes().toArray();
    console.log('الفهارس المتبقية:', indexes.map(idx => idx.name));
    
  } catch (error) {
    console.error('خطأ:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('تم قطع الاتصال مع قاعدة البيانات');
  }
}

dropIndexes();