# 🚀 LawBot Vercel Deployment Guide

## Prerequisites
- ✅ Vercel account (already signed up)
- ✅ GitHub account
- ✅ MongoDB Atlas account (for database)
- ✅ OpenAI API key
- ✅ Gemini API key (optional)

## 🔧 Quick Deployment Steps

### 1. Push to GitHub
```bash
# Initialize git repository (if not already done)
git init
git add .
git commit -m "Initial commit for Vercel deployment"

# Create GitHub repository and push
git remote add origin https://github.com/yourusername/lawbot.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Configure project settings:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `client/build`
   - **Install Command**: `npm install`

### 3. Environment Variables
In Vercel dashboard, go to Settings → Environment Variables and add:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lawbot

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# AI APIs
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
DEEPSEEK_API_KEY=your-deepseek-api-key

# App Config
NODE_ENV=production
FRONTEND_URL=https://your-app-name.vercel.app
BACKEND_URL=https://your-app-name.vercel.app

# Security
SESSION_SECRET=your-session-secret
CORS_ORIGIN=https://your-app-name.vercel.app
TRUST_PROXY=true
```

### 4. MongoDB Atlas Setup
1. Create MongoDB Atlas account at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create a new cluster (free tier available)
3. Create database user
4. Whitelist IP addresses (0.0.0.0/0 for Vercel)
5. Get connection string and add to `MONGODB_URI`

### 5. Deploy
1. Click "Deploy" in Vercel
2. Wait for build to complete
3. Your app will be available at `https://your-app-name.vercel.app`

## 🔍 Verification Steps

### Test Your Deployment
1. **Frontend**: Visit your Vercel URL
2. **API**: Test `https://your-app-name.vercel.app/api/health`
3. **Authentication**: Try registering/logging in
4. **Chat**: Test the AI chat functionality

### Common Issues & Solutions

#### Build Failures
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

#### API Routes Not Working
- Check `vercel.json` configuration
- Ensure API routes start with `/api/`
- Verify environment variables are set

#### Database Connection Issues
- Verify MongoDB URI format
- Check IP whitelist in MongoDB Atlas
- Ensure database user has proper permissions

#### CORS Issues
- Update `CORS_ORIGIN` environment variable
- Check frontend URL configuration

## 📁 Project Structure for Vercel
```
lawbot/
├── vercel.json          # Vercel configuration
├── .env.example         # Environment variables template
├── app.js              # Backend entry point
├── package.json        # Backend dependencies
├── client/             # React frontend
│   ├── build/          # Built frontend (auto-generated)
│   ├── package.json    # Frontend dependencies
│   └── src/           # Frontend source
├── routes/            # API routes
├── models/            # Database models
└── middleware/        # Express middleware
```

## 🚀 Advanced Configuration

### Custom Domain (Optional)
1. Go to Vercel project settings
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as instructed

### Performance Optimization
- Enable Vercel Analytics
- Configure caching headers
- Optimize images and assets
- Use Vercel Edge Functions for better performance

### Monitoring
- Set up Vercel monitoring
- Configure error tracking
- Monitor API response times
- Set up uptime monitoring

## 🔐 Security Best Practices
- Use strong JWT secrets
- Enable HTTPS only
- Configure proper CORS origins
- Regularly update dependencies
- Monitor for security vulnerabilities

## 📞 Support
If you encounter issues:
1. Check Vercel build logs
2. Review environment variables
3. Test API endpoints individually
4. Check MongoDB Atlas connection
5. Review application logs

---

**🎉 Your LawBot is now ready for production on Vercel!**

Access your application at: `https://your-app-name.vercel.app`