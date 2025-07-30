const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// Connect to the memory database
const connectToMemoryDB = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:50319/', {
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
    // Delete existing admin user if exists
    await User.deleteOne({ email: 'admin@lawbot.com' });
    console.log('🗑️ Deleted existing admin user');

    // Create a password that matches the validation pattern exactly
    const password = 'Admin123!'; // Contains: uppercase, lowercase, number, special char
    
    // Test the password against the validation regex
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    console.log('🔍 Password validation test:', passwordRegex.test(password));
    
    // Hash the password manually
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('🔐 Password hashed successfully');

    // Create admin user with minimal required fields
    const adminUser = new User({
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
        monthlyUsage: 0
      }
    });

    // Save without triggering password validation (since we already hashed it)
    await adminUser.save({ validateBeforeSave: false });
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@lawbot.com');
    console.log('🔑 Password: Admin123!');
    console.log('👤 Role: admin');
    
    // Test password comparison immediately
    const testUser = await User.findOne({ email: 'admin@lawbot.com' }).select('+password');
    const isValid = await bcrypt.compare(password, testUser.password);
    console.log('🧪 Password test result:', isValid);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    console.error('Full error:', error);
  }
};

const main = async () => {
  await connectToMemoryDB();
  await createAdminUser();
  
  console.log('\n🎉 Admin user creation completed!');
  console.log('\n📝 Login credentials:');
  console.log('   Email: admin@lawbot.com');
  console.log('   Password: Admin123!');
  
  mongoose.connection.close();
};

main().catch(console.error);