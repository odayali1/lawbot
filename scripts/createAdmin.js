const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
require('dotenv').config()

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('MongoDB connected successfully')
  } catch (error) {
    console.error('MongoDB connection error:', error)
    process.exit(1)
  }
}

// Create admin user
const createAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL })
    
    if (existingAdmin) {
      console.log('Admin user already exists!')
      console.log('Email:', process.env.ADMIN_EMAIL)
      console.log('You can use this account to login.')
      return
    }

    // Create admin user (password will be hashed by User model pre-save middleware)
    const adminUser = new User({
      name: 'System Administrator',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
      isEmailVerified: true,
      isActive: true,
      subscription: {
        plan: 'enterprise',
        startDate: new Date(),
        isActive: true
      },
      usage: {
        queriesThisMonth: 0,
        totalQueries: 0
      }
    })

    await adminUser.save()
    
    console.log('✅ Admin user created successfully!')
    console.log('📧 Email:', process.env.ADMIN_EMAIL)
    console.log('🔑 Password:', process.env.ADMIN_PASSWORD)
    console.log('👤 Role: admin')
    console.log('\n🚀 You can now login with these credentials!')
    
  } catch (error) {
    console.error('Error creating admin user:', error)
  }
}

// Main function
const main = async () => {
  await connectDB()
  await createAdmin()
  await mongoose.connection.close()
  console.log('\n✨ Database connection closed.')
}

// Run the script
main().catch(console.error)