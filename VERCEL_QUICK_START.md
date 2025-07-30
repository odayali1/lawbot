# 🚀 Vercel Quick Deployment Checklist

## ✅ Pre-Deployment Checklist
- [x] Vercel account created
- [x] Project configured for Vercel
- [x] Git repository ready
- [ ] GitHub repository created
- [ ] MongoDB Atlas database ready
- [ ] API keys obtained

## 🔥 5-Minute Deployment

### Step 1: Push to GitHub
```bash
# Create GitHub repo first, then:
git remote add origin https://github.com/yourusername/lawbot.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repo
4. Use these settings:
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `client/build`
   - **Root Directory**: `./`

### Step 3: Add Environment Variables
Copy from `.env.example` and set these in Vercel:

**Required:**
- `MONGODB_URI` - Your MongoDB Atlas connection string
- `JWT_SECRET` - Random secure string
- `OPENAI_API_KEY` - Your OpenAI API key
- `NODE_ENV` - Set to `production`

**Optional but Recommended:**
- `GEMINI_API_KEY` - Google Gemini API key
- `DEEPSEEK_API_KEY` - DeepSeek API key
- `SESSION_SECRET` - Random secure string

### Step 4: Deploy!
Click "Deploy" and wait ~2-3 minutes

## 🎯 Post-Deployment
- [ ] Test frontend at your Vercel URL
- [ ] Test API: `https://your-app.vercel.app/api/health`
- [ ] Create admin user
- [ ] Test chat functionality
- [ ] Upload legal documents

## 🔧 MongoDB Atlas Quick Setup
1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create free cluster
3. Create database user
4. Add IP: `0.0.0.0/0` (for Vercel)
5. Get connection string
6. Add to Vercel environment variables

## 🚨 Common Issues

**Build Failed?**
- Check Vercel build logs
- Ensure `npm run vercel-build` works locally

**API Not Working?**
- Verify environment variables in Vercel
- Check MongoDB connection string

**Frontend Not Loading?**
- Ensure `client/build` directory exists
- Check `vercel.json` routing configuration

## 📱 Your App URLs
- **Frontend**: `https://your-app-name.vercel.app`
- **API Health**: `https://your-app-name.vercel.app/api/health`
- **Admin Panel**: `https://your-app-name.vercel.app/admin`

---

**🎉 That's it! Your LawBot is live on Vercel!**

*Total deployment time: ~5-10 minutes*