const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('../models/User');

const createTestUser = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jordan-lawbot';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');

    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'demo@jordanlawbot.com' });
    
    if (existingUser) {
      console.log('ℹ️ Test user already exists');
      console.log('Email: demo@jordanlawbot.com');
      console.log('Password: demo123');
      return;
    }

    // Create test user
    const hashedPassword = await bcrypt.hash('demo123', 12);
    
    const testUser = new User({
      name: 'Demo User',
      email: 'demo@jordanlawbot.com',
      password: hashedPassword,
      role: 'lawyer',
      licenseNumber: 'DEMO123',
      barAssociation: 'Jordan Bar Association',
      specialization: ['Civil Law', 'Commercial Law'],
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

    await testUser.save();
    
    console.log('✅ Test user created successfully');
    console.log('Email: demo@jordanlawbot.com');
    console.log('Password: demo123');
    console.log('Role: lawyer');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
};

// Run the script
if (require.main === module) {
  createTestUser();
}

module.exports = createTestUser; 