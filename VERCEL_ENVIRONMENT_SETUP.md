# Vercel Environment Variables Setup

To fix the login issues, you need to configure the following environment variables in your Vercel project:

## Required Environment Variables

### 1. Database Configuration
```
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/jordan-lawbot?retryWrites=true&w=majority
```

### 2. JWT Configuration
```
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random-at-least-32-characters
JWT_EXPIRE=7d
```

### 3. Server Configuration
```
NODE_ENV=production
FRONTEND_URL=https://your-vercel-domain.vercel.app
```

## How to Set Environment Variables in Vercel

### Option 1: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Select your `lawbot` project
3. Go to **Settings** → **Environment Variables**
4. Add each variable with the following settings:
   - **Environment**: Production, Preview, Development (select all)
   - **Name**: Variable name (e.g., `MONGODB_URI`)
   - **Value**: Variable value
5. Click **Save**

### Option 2: Vercel CLI
```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Add environment variables
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel env add NODE_ENV
vercel env add FRONTEND_URL

# Pull the latest environment variables
vercel env pull .env.local
```

## MongoDB Atlas Setup (if you don't have a database)

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account
3. Create a new cluster
4. Create a database user with read/write permissions
5. Get your connection string
6. Replace `your-username`, `your-password`, and `your-cluster` in the MONGODB_URI

## JWT Secret Generation

Generate a secure JWT secret:
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32

# Option 3: Online generator
# Visit: https://generate-secret.vercel.app/32
```

## After Setting Environment Variables

1. **Redeploy your project** in Vercel
2. **Test the health endpoint**: `https://your-domain.vercel.app/api/health`
3. **Test login** with the demo account:
   - Email: `demo@jordanlawbot.com`
   - Password: `demo123`

## Troubleshooting

### If login still doesn't work:
1. Check Vercel deployment logs for errors
2. Verify MongoDB connection in logs
3. Ensure JWT_SECRET is set correctly
4. Check CORS configuration matches your domain

### Common Issues:
- **MongoDB connection failed**: Check MONGODB_URI format and credentials
- **JWT errors**: Ensure JWT_SECRET is set and not empty
- **CORS errors**: Verify FRONTEND_URL matches your actual domain
- **Build failures**: Check that all dependencies are in package.json

## Testing the Fix

After setting environment variables and redeploying:

1. Visit your Vercel app URL
2. Try to login with the demo account
3. Check browser console for any errors
4. Verify the API endpoints are working

## Support

If you continue to have issues:
1. Check Vercel deployment logs
2. Verify all environment variables are set
3. Ensure MongoDB Atlas is accessible
4. Check that the database user has proper permissions 