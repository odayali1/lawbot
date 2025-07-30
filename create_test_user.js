const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const createTestUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lawbot');
    
    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@lawbot.com' });
    if (existingUser) {
      console.log('Test user already exists');
      process.exit(0);
    }
    
    // Create test user
    const testUser = new User({
      name: 'Test User',
      email: 'test@lawbot.com',
      password: 'Test123!',
      role: 'user',
      isEmailVerified: true
    });
    
    await testUser.save();
    console.log('Test user created successfully');
    console.log('Email: test@lawbot.com');
    console.log('Password: Test123!');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

createTestUser();