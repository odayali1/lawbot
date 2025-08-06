# 🚀 LawBot Public Deployment Guide
## Deploy to https://aidemo.dollany.app

### 📋 Quick Deployment Checklist

#### 1. 📤 Upload Files to aaPanel
Upload these files to `/www/wwwroot/aidemo.dollany.app/`:

**Essential Files:**
- `app.js` - Main application file
- `server.js` - Server entry point
- `package.json` - Dependencies
- `package-lock.json` - Dependency lock
- `.env.production` - Environment variables
- `ecosystem.config.js` - PM2 configuration
- `nginx-aidemo.dollany.app.conf` - Nginx config

**Directories:**
- `client/build/` - Built React frontend
- `config/` - Database configuration
- `middleware/` - Express middleware
- `models/` - MongoDB models
- `routes/` - API routes
- `scripts/` - Utility scripts
- `data/` - Sample data

#### 2. 🔧 Server Setup Commands

```bash
# Navigate to your site directory
cd /www/wwwroot/aidemo.dollany.app

# Install dependencies
npm install --production

# Install PM2 globally
npm install -g pm2

# Copy environment file
cp .env.production .env

# Edit environment variables
nano .env
```

#### 3. 🔑 Environment Variables to Update

Edit `.env` file with your actual credentials:

```bash
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/lawbot

# JWT Secret (generate a strong secret)
JWT_SECRET=your-super-secure-jwt-secret-key

# Session Secret
SESSION_SECRET=your-super-secure-session-secret

# AI API Keys
OPENAI_API_KEY=sk-your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

#### 4. 🗄️ MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free cluster
3. Create a database user
4. Whitelist your server IP (or use 0.0.0.0/0 for all IPs)
5. Get connection string and update `MONGODB_URI`

#### 5. 🌐 aaPanel Website Configuration

1. **Create Website:**
   - Domain: `aidemo.dollany.app`
   - Document Root: `/www/wwwroot/aidemo.dollany.app`
   - PHP Version: Pure Static (we'll use Node.js)

2. **Configure Nginx:**
   - Use the provided `nginx-aidemo.dollany.app.conf`
   - Or manually add this configuration:

```nginx
server {
    listen 80;
    server_name aidemo.dollany.app;
    root /www/wwwroot/aidemo.dollany.app/client/build;
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ @backend;
    }

    # API routes to Node.js backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Fallback to Node.js for SPA routing
    location @backend {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 6. 🚀 Start the Application

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

#### 7. 🔒 SSL Certificate Setup

1. In aaPanel, go to Website → SSL
2. Select "Let's Encrypt"
3. Add domain: `aidemo.dollany.app`
4. Apply certificate

#### 8. 👤 Create Admin User

```bash
# Create admin user
node scripts/createAdmin.js
```

#### 9. ✅ Verification

1. **Check PM2 Status:**
   ```bash
   pm2 status
   pm2 logs
   ```

2. **Test URLs:**
   - Frontend: https://aidemo.dollany.app
   - API Health: https://aidemo.dollany.app/api/health
   - API Docs: https://aidemo.dollany.app/api

3. **Test Features:**
   - User registration/login
   - Chat functionality
   - Document search
   - Admin panel

### 🎯 Final Result

**Your LawBot will be live at: https://aidemo.dollany.app**

### 📱 Share with Friends

Once deployed, your friends can:
1. Visit https://aidemo.dollany.app
2. Register for an account
3. Test the AI legal chat
4. Search legal documents
5. Provide feedback

### 🔧 Useful Commands

```bash
# Check application status
pm2 status

# View logs
pm2 logs lawbot-api

# Restart application
pm2 restart lawbot-api

# Stop application
pm2 stop lawbot-api

# Monitor resources
pm2 monit

# Update application
git pull  # if using git
pm2 restart lawbot-api
```

### 🚨 Troubleshooting

**Common Issues:**

1. **502 Bad Gateway:**
   - Check if Node.js app is running: `pm2 status`
   - Check port 3000 is available: `netstat -tlnp | grep 3000`

2. **Database Connection Error:**
   - Verify MongoDB URI in `.env`
   - Check network access in MongoDB Atlas

3. **API Key Errors:**
   - Verify OpenAI/Gemini API keys
   - Check API key permissions and quotas

4. **File Permission Issues:**
   ```bash
   chown -R www:www /www/wwwroot/aidemo.dollany.app
   chmod -R 755 /www/wwwroot/aidemo.dollany.app
   ```

### 🎉 Success!

Your LawBot is now live and ready for testing!

**Next Steps:**
- Share the URL with friends
- Monitor usage and performance
- Collect feedback for improvements
- Consider adding analytics
- Plan for scaling if needed

---

**Need Help?** Check the detailed `AAPANEL_NODE_DEPLOYMENT.md` guide for more information.