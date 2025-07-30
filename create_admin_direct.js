const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to the memory database
const connectToMemoryDB = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:53093/', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to Memory Database');
  } catch (error) {
    console.error('❌ Memory Database connection error:', error.message);
    process.exit(1);
  }
};

const createAdminUserDirect = async () => {
  try {
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Delete existing admin user
    await usersCollection.deleteOne({ email: 'admin@lawbot.com' });
    console.log('🗑️ Deleted existing admin user');

    const password = 'Admin123!';
    console.log('🔑 Using password:', password);
    
    // Hash password manually
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('🔐 Hashed password:', hashedPassword);
    
    // Test the hash immediately
    const testResult = await bcrypt.compare(password, hashedPassword);
    console.log('🧪 Immediate hash test:', testResult);

    // Create user document directly
    const adminUser = {
      name: 'Admin User',
      email: 'admin@lawbot.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
      subscription: {
        plan: 'enterprise',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        monthlyUsage: 0,
        lastResetDate: new Date()
      },
      preferences: {
        notifications: {
          email: true,
          browser: true,
          marketing: false
        },
        language: 'en',
        theme: 'light'
      },
      usage: {
        queriesThisMonth: 0,
        totalQueries: 0
      },
      analytics: {
        totalSessions: 0,
        totalMessages: 0,
        averageSessionLength: 0,
        favoriteCategories: [],
        satisfactionScore: 0,
        totalRatings: 0
      },
      loginAttempts: 0,
      lastActivity: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert directly into MongoDB
    const result = await usersCollection.insertOne(adminUser);
    console.log('✅ Admin user inserted with ID:', result.insertedId);
    
    // Verify the user was created and test password
    const createdUser = await usersCollection.findOne({ email: 'admin@lawbot.com' });
    if (createdUser) {
      console.log('✅ User found in database');
      const passwordTest = await bcrypt.compare(password, createdUser.password);
      console.log('🧪 Database password test:', passwordTest);
    }
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    console.error('Full error:', error);
  }
};

const main = async () => {
  await connectToMemoryDB();
  await createAdminUserDirect();
  
  console.log('\n🎉 Direct admin user creation completed!');
  console.log('\n📝 Login credentials:');
  console.log('   Email: admin@lawbot.com');
  console.log('   Password: Admin123!');
  
  mongoose.connection.close();
};

main().catch(console.error);