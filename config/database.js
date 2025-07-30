const mongoose = require('mongoose');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Connect to MongoDB database
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    // MongoDB connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0, // Disable mongoose buffering
    };

    // Add authentication options if credentials are provided
    if (process.env.MONGODB_USERNAME && process.env.MONGODB_PASSWORD) {
      options.auth = {
        username: process.env.MONGODB_USERNAME,
        password: process.env.MONGODB_PASSWORD
      };
    }

    // Connect to MongoDB
    const conn = await mongoose.connect(mongoURI, options);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    logger.info(`Database: ${conn.connection.name}`);
    
    return conn;
  } catch (error) {
    logger.error('MongoDB connection error:', error.message);
    
    // Exit process with failure
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB database
 * @returns {Promise<void>}
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error.message);
  }
};

/**
 * Get database connection status
 * @returns {string} Connection status
 */
const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return states[mongoose.connection.readyState] || 'unknown';
};

/**
 * Get database statistics
 * @returns {Object} Database statistics
 */
const getDatabaseStats = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return { error: 'Database not connected' };
    }

    const db = mongoose.connection.db;
    const stats = await db.stats();
    
    return {
      database: db.databaseName,
      collections: stats.collections,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize,
      indexes: stats.indexes,
      indexSize: stats.indexSize,
      objects: stats.objects
    };
  } catch (error) {
    logger.error('Error getting database stats:', error.message);
    return { error: error.message };
  }
};

// Connection event listeners
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  logger.error('Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected from MongoDB');
});

// Handle application termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT. Gracefully shutting down...');
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM. Gracefully shutting down...');
  await disconnectDB();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (err) => {
  logger.error('Uncaught Exception:', err);
  await disconnectDB();
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (err) => {
  logger.error('Unhandled Rejection:', err);
  await disconnectDB();
  process.exit(1);
});

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  getDatabaseStats
};