# 🚀 LawBot aaPanel Node.js Deployment Guide

## 📋 Prerequisites
- ✅ aaPanel server with Node.js installed
- ✅ Domain `aidemo.dollany.app` pointing to your server
- ✅ MongoDB Atlas account (free tier)
- ✅ OpenAI API key
- ✅ SSH access to your server

## 🎯 Node.js Deployment Steps

### Step 1: Upload Project Files
1. **Login to aaPanel** at your server IP
2. **File Manager** → Navigate to `/www/wwwroot/`
3. **Create folder**: `aidemo.dollany.app`
4. **Upload** `lawbot-deploy.zip` to this folder
5. **Extract** the zip file

### Step 2: Setup Node.js Environment
```bash
# SSH into your server
ssh root@your-server-ip

# Navigate to project directory
cd /www/wwwroot/aidemo.dollany.app

# Install Node.js dependencies
npm install --production

# Install PM2 globally for process management
npm install -g pm2
```

### Step 3: Configure Environment Variables
**Copy and edit the environment file:**
```bash
cp .env.production .env
nano .env  # or use vi/vim
```

**Update with your actual credentials:**
```env
# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lawbot?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_EXPIRES_IN=7d

# AI API Keys
OPENAI_API_KEY=sk-your-openai-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here
DEEPSEEK_API_KEY=your-deepseek-api-key-here

# Application Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://aidemo.dollany.app
BACKEND_URL=https://aidemo.dollany.app

# Session Configuration
SESSION_SECRET=another-super-secret-session-key

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Security
CORS_ORIGIN=https://aidemo.dollany.app
TRUST_PROXY=true
```

### Step 4: Setup MongoDB Atlas
1. **Go to** [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. **Create free cluster**
3. **Database Access** → Create user with read/write permissions
4. **Network Access** → Add IP `0.0.0.0/0` (or your server IP)
5. **Connect** → Get connection string
6. **Update** `MONGODB_URI` in `.env` file

### Step 5: Create Website in aaPanel
1. **Website** → **Add Site**
2. **Domain**: `aidemo.dollany.app`
3. **Root Directory**: `/www/wwwroot/aidemo.dollany.app`
4. **PHP**: Disable (Node.js app)
5. **Create** the website

### Step 6: Configure Nginx
1. **Website** → **aidemo.dollany.app** → **Config**
2. **Replace** with this Nginx configuration:

```nginx
server {
    listen 80;
    server_name aidemo.dollany.app;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    # Serve static files
    location /static/ {
        alias /www/wwwroot/aidemo.dollany.app/public/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:3001/api/health;
        access_log off;
    }
    
    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
        root /www/wwwroot/aidemo.dollany.app/public;
        index index.html;
    }
}
```

3. **Save** and **Reload** Nginx

### Step 7: Start Node.js Application
```bash
# Navigate to project directory
cd /www/wwwroot/aidemo.dollany.app

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown
```

### Step 8: Setup SSL Certificate
1. **Website** → **aidemo.dollany.app** → **SSL**
2. **Let's Encrypt** → **Apply**
3. **Enable Force HTTPS**

### Step 9: Create Admin User
```bash
# SSH into server
cd /www/wwwroot/aidemo.dollany.app

# Create admin user
node scripts/createAdmin.js
```

## 🔍 Verification & Testing

### Check Application Status
```bash
# Check PM2 processes
pm2 status

# View application logs
pm2 logs lawbot-api

# Check if app is responding
curl http://localhost:3001/api/health
```

### Test Your Deployment
1. **Frontend**: https://aidemo.dollany.app
2. **API Health**: https://aidemo.dollany.app/api/health
3. **Admin Panel**: https://aidemo.dollany.app/admin

## 🚨 Troubleshooting

### Common Issues

**App won't start:**
```bash
# Check logs
pm2 logs lawbot-api

# Check environment variables
cat .env

# Test MongoDB connection
node -e "require('mongoose').connect(process.env.MONGODB_URI || 'your-mongo-uri').then(() => console.log('DB Connected')).catch(err => console.error('DB Error:', err))"
```

**502 Bad Gateway:**
```bash
# Check if app is running on port 3001
netstat -tlnp | grep 3001

# Restart application
pm2 restart lawbot-api
```

**Database connection issues:**
- Verify MongoDB URI format
- Check IP whitelist in MongoDB Atlas
- Ensure database user has correct permissions

## 📱 Useful Commands

```bash
# PM2 Management
pm2 status                 # Check all processes
pm2 logs lawbot-api        # View logs
pm2 restart lawbot-api     # Restart app
pm2 stop lawbot-api        # Stop app
pm2 delete lawbot-api      # Remove from PM2

# Application Management
npm install --production    # Install dependencies
node app.js                # Run directly (for testing)

# System Monitoring
htop                       # System resources
df -h                      # Disk usage
free -m                    # Memory usage
```

## 🔐 Security Checklist
- ✅ Strong JWT secret (32+ characters)
- ✅ Secure session secret
- ✅ MongoDB user with minimal permissions
- ✅ SSL certificate enabled
- ✅ Rate limiting configured
- ✅ Security headers set
- ✅ CORS properly configured

## 🎉 Success!

Your LawBot is now running at: **https://aidemo.dollany.app**

### Next Steps:
1. Upload legal documents via admin panel
2. Test chat functionality
3. Configure email notifications (optional)
4. Set up monitoring and backups
5. Customize system instructions

---

**📞 Need Help?**
- Check PM2 logs: `pm2 logs lawbot-api`
- Monitor system: `htop`
- Test API: `curl https://aidemo.dollany.app/api/health`