# LawBot Backend API

A comprehensive AI-powered legal consultation platform backend built with Node.js, Express, and MongoDB. This system provides intelligent legal document search, AI-powered consultation, user management, subscription handling, and administrative tools.

## 🚀 Features

### Core Functionality
- **AI-Powered Legal Consultation**: Integration with OpenAI for intelligent legal advice
- **Advanced Document Search**: Full-text search with filtering, categorization, and relevance ranking
- **User Authentication & Authorization**: JWT-based auth with role-based access control
- **Subscription Management**: Stripe integration for payment processing and plan management
- **Real-time Notifications**: Email and in-app notification system
- **Admin Dashboard**: Comprehensive platform management and analytics

### Technical Features
- **RESTful API**: Well-structured endpoints following REST principles
- **Rate Limiting**: Protection against abuse and DDoS attacks
- **File Upload**: Support for PDF, DOC, DOCX, and TXT legal documents
- **Data Validation**: Comprehensive input validation using Joi and express-validator
- **Error Handling**: Centralized error handling with detailed logging
- **Security**: Helmet, CORS, XSS protection, and input sanitization
- **Caching**: Redis integration for improved performance
- **Logging**: Winston-based logging with multiple levels

## 📋 Prerequisites

- Node.js (v16.0.0 or higher)
- MongoDB (v4.4 or higher)
- Redis (optional, for caching)
- OpenAI API key
- Stripe account (for payments)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/lawbot-backend.git
   cd lawbot-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file with your configuration values.

4. **Database Setup**
   ```bash
   # Start MongoDB service
   # For Windows:
   net start MongoDB
   
   # For macOS/Linux:
   sudo systemctl start mongod
   ```

5. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 🔧 Configuration

### Environment Variables

Key environment variables you need to configure:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/lawbot

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Stripe
STRIPE_SECRET_KEY=sk_test_your-stripe-secret
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

See `.env.example` for complete configuration options.

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/refresh` | Refresh JWT token |
| POST | `/api/auth/logout` | User logout |

### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get user profile |
| PUT | `/api/users/profile` | Update user profile |
| PUT | `/api/users/password` | Change password |
| GET | `/api/users/dashboard` | User dashboard data |
| GET | `/api/users/analytics` | User analytics |

### Chat & Consultation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/message` | Send chat message |
| GET | `/api/chat/sessions` | Get user sessions |
| GET | `/api/chat/sessions/:id` | Get specific session |
| DELETE | `/api/chat/sessions/:id` | Delete session |
| GET | `/api/chat/categories` | Get chat categories |

### Document Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents/search` | Search documents |
| GET | `/api/documents/:id` | Get document by ID |
| GET | `/api/documents/:id/articles/:articleNumber` | Get specific article |
| GET | `/api/documents/meta/categories` | Get document categories |
| POST | `/api/documents` | Create document (Admin) |
| POST | `/api/documents/upload` | Upload document (Admin) |
| PUT | `/api/documents/:id` | Update document (Admin) |
| DELETE | `/api/documents/:id` | Delete document (Admin) |

### Advanced Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search/documents` | Basic document search |
| GET | `/api/search/advanced` | Advanced search with filters |
| GET | `/api/search/suggestions` | Search suggestions |
| GET | `/api/search/similar/:documentId` | Find similar documents |
| GET | `/api/search/popular` | Get popular documents |
| POST | `/api/search/feedback` | Submit search feedback |
| GET | `/api/search/history` | Get search history |

### Subscription Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscription/plans` | Get available plans |
| GET | `/api/subscription/current` | Get current subscription |
| POST | `/api/subscription/create-payment-intent` | Create payment intent |
| POST | `/api/subscription/confirm-payment` | Confirm payment |
| POST | `/api/subscription/upgrade` | Upgrade subscription |
| POST | `/api/subscription/downgrade` | Downgrade subscription |
| POST | `/api/subscription/cancel` | Cancel subscription |
| POST | `/api/subscription/reactivate` | Reactivate subscription |
| GET | `/api/subscription/payment-history` | Get payment history |
| GET | `/api/subscription/usage` | Get usage statistics |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get user notifications |
| PUT | `/api/notifications/:id/read` | Mark notification as read |
| PUT | `/api/notifications/read-all` | Mark all as read |
| DELETE | `/api/notifications/:id` | Delete notification |
| GET | `/api/notifications/preferences` | Get notification preferences |
| PUT | `/api/notifications/preferences` | Update preferences |
| POST | `/api/notifications/send` | Send notification (Admin) |
| POST | `/api/notifications/broadcast` | Broadcast message (Admin) |

### Admin Panel

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Admin dashboard |
| GET | `/api/admin/users` | Get all users |
| GET | `/api/admin/users/:id` | Get user details |
| POST | `/api/admin/users` | Create user |
| PUT | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/sessions` | Get all sessions |
| GET | `/api/admin/analytics` | Platform analytics |
| GET | `/api/admin/system/health` | System health |
| POST | `/api/admin/system/backup` | Create backup |

## 🏗️ Project Structure

```
lawbot-backend/
├── app.js                 # Main application file
├── package.json          # Dependencies and scripts
├── .env.example         # Environment variables template
├── README.md            # Project documentation
├── config/
│   └── database.js      # Database configuration
├── middleware/
│   ├── auth.js          # Authentication middleware
│   ├── errorHandler.js  # Error handling middleware
│   └── validation.js    # Validation middleware
├── models/
│   ├── User.js          # User model
│   ├── ChatSession.js   # Chat session model
│   └── LegalDocument.js # Legal document model
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── users.js         # User management routes
│   ├── chat.js          # Chat and consultation routes
│   ├── documents.js     # Document management routes
│   ├── search.js        # Search functionality routes
│   ├── subscription.js  # Subscription management routes
│   ├── notifications.js # Notification system routes
│   └── admin.js         # Admin panel routes
├── uploads/             # File upload directory
├── logs/               # Application logs
└── tests/              # Test files
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: User, Admin, and Super Admin roles
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive data validation
- **XSS Protection**: Cross-site scripting prevention
- **CORS Configuration**: Cross-origin resource sharing control
- **Helmet Security**: Security headers configuration
- **MongoDB Injection Prevention**: Query sanitization
- **Password Hashing**: bcrypt for secure password storage

## 📊 Subscription Plans

| Plan | Monthly Queries | Price | Features |
|------|----------------|-------|----------|
| Free | 10 | $0 | Basic search, limited chat |
| Basic | 100 | $9.99 | Full search, email support |
| Premium | 500 | $29.99 | Priority support, analytics |
| Enterprise | Unlimited | $99.99 | Custom features, dedicated support |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📝 Logging

The application uses Winston for logging with multiple levels:

- **Error**: System errors and exceptions
- **Warn**: Warning messages
- **Info**: General information
- **Debug**: Detailed debugging information

Logs are stored in `./logs/app.log` and also output to console in development.

## 🚀 Deployment

### Production Deployment

1. **Set environment variables**
   ```bash
   export NODE_ENV=production
   export MONGODB_URI=your-production-mongodb-uri
   export JWT_SECRET=your-production-jwt-secret
   # ... other production variables
   ```

2. **Install production dependencies**
   ```bash
   npm ci --only=production
   ```

3. **Start the application**
   ```bash
   npm start
   ```

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- 📧 Email: support@lawbot.com
- 📖 Documentation: [API Docs](http://localhost:5000/api)
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/lawbot-backend/issues)

## 🔄 Changelog

### v1.0.0 (Current)
- Initial release
- Complete API implementation
- User authentication and authorization
- Document management system
- AI-powered legal consultation
- Subscription and payment processing
- Admin dashboard and analytics
- Notification system
- Advanced search functionality

---

**Built with ❤️ for the legal community**