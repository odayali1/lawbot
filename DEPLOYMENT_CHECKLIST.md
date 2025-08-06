# 🚀 LawBot Deployment Checklist for aidemo.dollany.app

## ✅ Files Created
- `lawbot-deploy.zip` - Complete deployment package (851KB)
- `DEPLOYMENT_GUIDE.md` - Detailed deployment instructions
- `nginx-aidemo.dollany.app.conf` - Nginx configuration
- `ecosystem.config.js` - PM2 process management
- `.env.production` - Environment variables template

## 📦 Deployment Package Contents
- ✅ Backend application files (app.js, server.js, routes/, models/, etc.)
- ✅ Frontend build files (React app in public/ folder)
- ✅ Configuration files (PM2, environment template)
- ✅ Package.json with all dependencies

## 🎯 Quick Deployment Steps

### 1. Upload to Your Server
```bash
# Upload lawbot-deploy.zip to your aaPanel server
# Extract to: /www/wwwroot/aidemo.dollany.app/
```

### 2. Server Setup Commands
```bash
# Navigate to your app directory
cd /www/wwwroot/aidemo.dollany.app/

# Install dependencies
npm install --production

# Create logs directory
mkdir -p logs

# Copy and configure environment
cp .env.example .env
nano .env  # Edit with your actual values
```

### 3. Configure Environment Variables
Edit `.env` file with these required values:
```env
MONGODB_URI=mongodb://localhost:27017/lawbot_prod
JWT_SECRET=your-super-secret-jwt-key
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 4. Setup Nginx
```bash
# Copy nginx configuration
cp nginx-aidemo.dollany.app.conf /etc/nginx/sites-available/aidemo.dollany.app
ln -s /etc/nginx/sites-available/aidemo.dollany.app /etc/nginx/sites-enabled/

# Test and reload nginx
nginx -t
systemctl reload nginx
```

### 5. Start Application
```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

### 6. Setup SSL Certificate
```bash
# Install certbot if not already installed
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d aidemo.dollany.app
```

## 🔧 Required Services

### MongoDB Setup
```bash
# Install MongoDB
sudo apt update
sudo apt install mongodb

# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Create database and user
mongo
use lawbot_prod
db.createUser({
  user: "lawbot_user",
  pwd: "secure_password",
  roles: [{ role: "readWrite", db: "lawbot_prod" }]
})
```

### Node.js Setup
```bash
# Install Node.js 18+ (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 🧪 Testing Your Deployment

1. **Health Check**: `curl https://aidemo.dollany.app/api/health`
2. **Frontend**: Visit `https://aidemo.dollany.app`
3. **API Test**: Test registration/login functionality
4. **Database**: Verify data persistence

## 📊 Monitoring Commands

```bash
# Check application status
pm2 status

# View logs
pm2 logs lawbot-api

# Monitor resources
pm2 monit

# Restart if needed
pm2 restart lawbot-api
```

## 🔒 Security Checklist

- [ ] Firewall configured (ports 80, 443 open)
- [ ] SSL certificate installed
- [ ] Strong passwords for database
- [ ] Environment variables secured
- [ ] Regular backups scheduled
- [ ] Log monitoring setup

## 🆘 Troubleshooting

### Common Issues:
1. **Port 3001 in use**: `sudo lsof -i :3001`
2. **Permission denied**: `sudo chown -R www-data:www-data /www/wwwroot/aidemo.dollany.app/`
3. **MongoDB connection**: Check if MongoDB is running
4. **Nginx errors**: Check `/var/log/nginx/error.log`

### Debug Commands:
```bash
# Check if app is running
netstat -tlnp | grep 3001

# Check nginx configuration
nginx -t

# View application logs
tail -f /www/wwwroot/aidemo.dollany.app/logs/combined.log
```

## 📞 Support

If you encounter issues:
1. Check the logs first: `pm2 logs lawbot-api`
2. Verify environment variables are set correctly
3. Ensure all services (MongoDB, Nginx) are running
4. Check firewall and port configurations

---

**🎉 Your LawBot will be live at: https://aidemo.dollany.app**

**Estimated deployment time: 15-30 minutes**