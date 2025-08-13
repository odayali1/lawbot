const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Test environment variables
console.log('🔍 Checking Environment Variables:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
console.log('NODE_ENV:', process.env.NODE_ENV || '❌ Missing');
console.log('');

// Test MongoDB connection
const testConnection = async () => {
  try {
    console.log('🔌 Testing MongoDB connection...');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully!');
    
    // Test database operations
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('📚 Available collections:', collections.map(c => c.name));
    
    // Test User model
    const User = require('../models/User');
    
    // Check if demo user exists
    const existingUser = await User.findOne({ email: 'demo@jordanlawbot.com' });
    
    if (existingUser) {
      console.log('✅ Demo user already exists');
      console.log('Email: demo@jordanlawbot.com');
      console.log('Password: demo123');
    } else {
      console.log('👤 Creating demo user...');
      
      // Create demo user
      const hashedPassword = await bcrypt.hash('demo123', 12);
      
      const demoUser = new User({
        name: 'Demo User',
        email: 'demo@jordanlawbot.com',
        password: hashedPassword,
        role: 'lawyer',
        licenseNumber: 'DEMO123',
        barAssociation: 'Jordan Bar Association',
        specialization: 'Civil Law, Commercial Law',
        isEmailVerified: true,
        isActive: true,
        subscription: {
          plan: 'pro',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          monthlyUsage: 0
        }
      });
      
      await demoUser.save();
      console.log('✅ Demo user created successfully!');
      console.log('Email: demo@jordanlawbot.com');
      console.log('Password: demo123');
    }
    
    // Test JWT token generation
    if (process.env.JWT_SECRET) {
      const jwt = require('jsonwebtoken');
      const testToken = jwt.sign({ userId: 'test' }, process.env.JWT_SECRET, { expiresIn: '1h' });
      console.log('✅ JWT token generation working!');
      console.log('Token preview:', testToken.substring(0, 20) + '...');
    } else {
      console.log('❌ JWT_SECRET not set - cannot test token generation');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('MongoNetworkError')) {
      console.log('💡 Tip: Check your MongoDB connection string and network access');
    } else if (error.message.includes('MongoParseError')) {
      console.log('💡 Tip: Check your MongoDB connection string format');
    } else if (error.message.includes('MongoServerSelectionError')) {
      console.log('💡 Tip: Check if your MongoDB cluster is accessible');
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
};

// Run the test
testConnection(); 