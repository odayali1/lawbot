const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// Connect to the memory database (assuming it's running on the default port from our server)
const connectToMemoryDB = async () => {
  try {
    // Connect to the memory database that's running with our server
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

const createAdminUser = async () => {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@lawbot.com' });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      return;
    }

    // Create admin user (password will be hashed automatically by pre-save middleware)
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@lawbot.com',
      password: 'LawBot2024!Admin',
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
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@lawbot.com');
    console.log('🔑 Password: LawBot2024!Admin');
    console.log('👤 Role: admin');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }
};

const createTestUser = async () => {
  try {
    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    
    if (existingUser) {
      console.log('✅ Test user already exists');
      return;
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('TestPassword123!', saltRounds);

    // Create test user
    const testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'user',
      isEmailVerified: true,
      subscription: {
        plan: 'free',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        queriesUsed: 0,
        queryLimit: 10
      }
    });

    await testUser.save();
    
    console.log('✅ Test user created successfully!');
    console.log('📧 Email: test@example.com');
    console.log('🔑 Password: TestPassword123!');
    console.log('👤 Role: user');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  }
};

const main = async () => {
  await connectToMemoryDB();
  await createAdminUser();
  await createTestUser();
  
  console.log('\n🎉 User creation completed!');
  console.log('\n📝 You can now login with:');
  console.log('   Admin: admin@lawbot.com / LawBot2024!Admin');
  console.log('   Test User: test@example.com / TestPassword123!');
  
  mongoose.connection.close();
};

main().catch(console.error);