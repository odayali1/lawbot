# LawBot Deployment Guide for aaPanel

## Prerequisites
- aaPanel server with API access
- Domain: `aidemo.dollany.app` (already configured)
- MongoDB database
- Node.js 18+ support

## Quick Deployment Steps

### 1. Prepare the Application
```bash
# Build the React frontend
cd client
npm run build
cd ..

# Run the deployment script
node deploy-to-aapanel.js
```

### 2. Manual Server Setup

#### A. Upload Files to Server
1. Upload `lawbot-deploy.zip` to your server
2. Extract to `/www/wwwroot/aidemo.dollany.app/`
3. Set proper permissions: `chmod -R 755 /www/wwwroot/aidemo.dollany.app/`

#### B. Install Dependencies
```bash
cd /www/wwwroot/aidemo.dollany.app/
npm install --production
```

#### C. Configure Environment Variables
Create `.env` file:
```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://localhost:27017/lawbot_prod
JWT_SECRET=your-super-secret-jwt-key-change-this-to-something-secure
FRONTEND_URL=https://aidemo.dollany.app
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
```

#### D. Setup MongoDB
1. Install MongoDB on your server
2. Create database: `lawbot_prod`
3. Import your existing data if needed

#### E. Configure Reverse Proxy (Nginx)
Create nginx configuration for your domain:
```nginx
server {
    listen 80;
    server_name aidemo.dollany.app;
    
    # Serve static files
    location /static/ {
        root /www/wwwroot/aidemo.dollany.app/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API routes
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Serve React app
    location / {
        root /www/wwwroot/aidemo.dollany.app/public;
        try_files $uri $uri/ /index.html;
    }
}
```

#### F. Setup PM2 for Process Management
```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'lawbot',
    script: './app.js',
    cwd: '/www/wwwroot/aidemo.dollany.app',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start the application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. SSL Certificate Setup
```bash
# Using Let's Encrypt (if not done automatically)
certbot --nginx -d aidemo.dollany.app
```

### 4. Database Setup
```bash
# Connect to MongoDB
mongo

# Create database and user
use lawbot_prod
db.createUser({
  user: "lawbot_user",
  pwd: "secure_password_here",
  roles: [{ role: "readWrite", db: "lawbot_prod" }]
})
```

### 5. Security Configuration

#### A. Firewall Rules
```bash
# Allow HTTP/HTTPS
ufw allow 80
ufw allow 443

# Allow SSH (if needed)
ufw allow 22

# Block direct access to Node.js port
ufw deny 3001
```

#### B. Additional Security
- Change default SSH port
- Setup fail2ban
- Regular security updates
- Monitor logs regularly

## Testing the Deployment

1. **Health Check**: Visit `https://aidemo.dollany.app/api/health`
2. **Frontend**: Visit `https://aidemo.dollany.app`
3. **API Test**: Test login/register functionality
4. **Database**: Verify data persistence

## Monitoring and Maintenance

### PM2 Commands
```bash
pm2 status          # Check app status
pm2 logs lawbot     # View logs
pm2 restart lawbot  # Restart app
pm2 reload lawbot   # Zero-downtime reload
pm2 stop lawbot     # Stop app
```

### Log Files
- Application logs: `/www/wwwroot/aidemo.dollany.app/logs/`
- Nginx logs: `/var/log/nginx/`
- MongoDB logs: `/var/log/mongodb/`

### Backup Strategy
```bash
# Database backup
mongodump --db lawbot_prod --out /backup/mongodb/$(date +%Y%m%d)

# Application backup
tar -czf /backup/app/lawbot-$(date +%Y%m%d).tar.gz /www/wwwroot/aidemo.dollany.app/
```

## Troubleshooting

### Common Issues
1. **Port conflicts**: Ensure port 3001 is available
2. **Permission issues**: Check file permissions
3. **Database connection**: Verify MongoDB is running
4. **SSL issues**: Check certificate validity
5. **Memory issues**: Monitor server resources

### Debug Commands
```bash
# Check if app is running
netstat -tlnp | grep 3001

# Check nginx configuration
nginx -t

# Check MongoDB status
systemctl status mongod

# View real-time logs
pm2 logs lawbot --lines 100
```

## Performance Optimization

1. **Enable Gzip compression** in Nginx
2. **Setup Redis caching** for sessions
3. **Database indexing** for better query performance
4. **CDN setup** for static assets
5. **Monitor resource usage** with PM2 monitoring

## Support

If you encounter issues:
1. Check the logs first
2. Verify all environment variables
3. Ensure all services are running
4. Test database connectivity
5. Check firewall rules

---

**Your LawBot will be available at: https://aidemo.dollany.app**