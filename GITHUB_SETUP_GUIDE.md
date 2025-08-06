# GitHub Setup and Deployment Guide

## Step 1: Create GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Fill in the repository details:
   - **Repository name**: `lawbot` (or your preferred name)
   - **Description**: "AI-powered legal consultation chatbot with document search"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

## Step 2: Connect Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these in your terminal:

```bash
# Add the remote repository (replace YOUR_USERNAME and YOUR_REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push your code to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Vercel

1. Go to [Vercel.com](https://vercel.com) and sign in with your GitHub account
2. Click "New Project"
3. Import your newly created GitHub repository
4. Configure the project settings:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `client/build`
   - **Install Command**: `npm install`

## Step 4: Environment Variables in Vercel

Add these environment variables in Vercel dashboard:

```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=production
PORT=5000
```

## Step 5: Verify Deployment

1. Wait for the build to complete
2. Visit your Vercel deployment URL
3. Test the application functionality
4. Check the logs if there are any issues

## Current Project Status

✅ **Completed:**
- Project cleaned up (removed development scripts)
- Code committed to local Git repository
- Deployment configurations added
- Environment templates created

🔄 **Next Steps:**
- Create GitHub repository
- Push code to GitHub
- Deploy to Vercel

## Troubleshooting

### Build Issues
- Ensure all environment variables are set
- Check Vercel build logs for specific errors
- Verify MongoDB connection string is correct

### Runtime Issues
- Check Vercel function logs
- Ensure API keys are valid
- Verify database connectivity

---

**Ready for GitHub!** Your code is clean, committed, and ready to push to GitHub for Vercel deployment.