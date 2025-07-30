const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to the memory database
const connectToMemoryDB = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:54158/', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to Memory Database');
  } catch (error) {
    console.error('❌ Memory Database connection error:', error.message);
    process.exit(1);
  }
};

const fixAdminPassword = async () => {
  try {
    console.log('=== Fixing Admin Password ===\n');
    
    // Delete existing admin user
    const deleteResult = await User.deleteOne({ email: 'admin@lawbot.com' });
    console.log('🗑️ Deleted existing admin user:', deleteResult.deletedCount > 0 ? 'Success' : 'Not found');
    
    // Create new admin user with correct password (will be hashed by pre-save middleware)
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@lawbot.com',
      password: 'LawBot2024!Admin', // This will be hashed automatically
      role: 'admin',
      isEmailVerified: true,
      subscription: {
        plan: 'enterprise',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        queriesUsed: 0,
        queryLimit: -1 // Unlimited
      }
    });
    
    await adminUser.save();
    console.log('✅ Created new admin user with correct password');
    
    // Test the password
    const testUser = await User.findOne({ email: 'admin@lawbot.com' }).select('+password');
    const isPasswordValid = await testUser.correctPassword('LawBot2024!Admin', testUser.password);
    
    console.log('\n🔍 Password verification test:', isPasswordValid ? '✅ SUCCESS' : '❌ FAILED');
    
    if (isPasswordValid) {
      console.log('\n📝 Login Credentials:');
      console.log('   Email: admin@lawbot.com');
      console.log('   Password: LawBot2024!Admin');
    }
    
  } catch (error) {
    console.error('❌ Error fixing admin password:', error.message);
  }
};

const main = async () => {
  await connectToMemoryDB();
  await fixAdminPassword();
  await mongoose.connection.close();
  console.log('\n✨ Database connection closed.');
};

main().catch(console.error);