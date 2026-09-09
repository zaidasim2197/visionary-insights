# VisionPulse Vercel Deployment Guide

This guide explains how to deploy VisionPulse to Vercel with proper environment configuration.

## Prerequisites

- Node.js 20.x or higher
- npm or yarn package manager
- Vercel CLI: `npm install -g vercel`
- GitHub account with your repository connected to Vercel

## Environment Variables

### Required Variables for Vercel

Add these to your Vercel project settings:

1. **GEMINI_API_KEY** (Required)
   - Purpose: API key for AI-powered business intelligence features
   - Source: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Steps:
     1. Go to Google Cloud Console
     2. Create a new project or select existing
     3. Enable the Generative Language API
     4. Create an API key from credentials
     5. Copy the key to Vercel environment variable

### Optional Variables

```
VERCEL_ENV=production          # Set automatically by Vercel
VERCEL_URL=your-app.vercel.app # Set automatically by Vercel
```

## Setup Instructions

### Step 1: Prepare Local Environment

```bash
# Install dependencies
npm install

# Test local build
npm run build

# Test preview locally
npm run preview
```

### Step 2: Configure Vercel Project

#### Option A: Using Vercel CLI

```bash
# Login to Vercel
vercel login

# Link to existing Vercel project
vercel link

# Set environment variables
vercel env add GEMINI_API_KEY
# Paste your Gemini API key when prompted

# Deploy to staging
vercel deploy

# Deploy to production
vercel deploy --prod
```

#### Option B: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Select your GitHub repository
4. Configure project:
   - Framework: Other
   - Build Command: `npm run build`
   - Output Directory: `.output/public`
5. Add Environment Variables:
   - `GEMINI_API_KEY`: Your Gemini API key
6. Click "Deploy"

### Step 3: Push Code to Main Branch

```bash
# Commit all changes
git add .
git commit -m "chore: add Vercel deployment configuration"

# Push to main branch
git push origin main

# This automatically triggers Vercel deployment
```

## Deployment Scripts

Use these npm scripts to deploy:

```bash
# Deploy to production (requires --prod flag or git push)
npm run deploy:vercel

# Deploy preview (for testing)
npm run deploy:preview

# Or use Vercel CLI directly
vercel deploy --prod
```

## Configuration Files

### vercel.json
- Specifies build command and output directory
- Defines environment variables
- Configures rewrites for client-side routing

### nitro.config.ts
- Auto-detects Vercel environment
- Switches between Vercel and Cloudflare presets
- Configures API routes and caching

### .vercelignore
- Specifies files to exclude from deployment
- Reduces bundle size and deployment time

## Monitoring Deployment

### Vercel Dashboard
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. View:
   - Build logs
   - Deployment history
   - Analytics
   - Environment variables

### Check Deployment Status

```bash
# View recent deployments
vercel list

# Check specific deployment
vercel inspect [deployment-url]
```

## Troubleshooting

### Build Fails

**Error: "Cannot find module '@lovable.dev/vite-tanstack-config'"**
- Solution: Run `npm install` locally first, then push to main

**Error: "GEMINI_API_KEY is undefined"**
- Solution: Add `GEMINI_API_KEY` to Vercel environment variables
- Check: Vercel Dashboard → Settings → Environment Variables

### Deployment Succeeds but Site Shows 404

- Ensure `.output/public` is the output directory
- Check `vercel.json` rewrites configuration
- Verify build output contains public assets

### API Calls Fail

- Verify `GEMINI_API_KEY` is set and valid
- Check browser console for CORS errors
- Review Vercel function logs

## Performance Optimization

### Caching Strategy
- Static assets (CSS, JS): 1 year cache
- HTML: No cache (always fresh)
- API routes: No cache (dynamic data)

### Bundle Size
- Current bundle: ~2-3 MB (gzipped)
- Monitor at: Vercel Dashboard → Analytics
- Optimize with: `npm run lint` and code splitting

## Security Best Practices

1. **Never commit `.env` file**
   - Use `.env.example` for reference
   - Set all secrets in Vercel dashboard

2. **API Key Security**
   - Keep `GEMINI_API_KEY` private
   - Rotate keys periodically
   - Monitor usage in Google Cloud Console

3. **Git Permissions**
   - Use personal access tokens for CI/CD
   - Limit branch access for deployments
   - Review all code changes via pull requests

## Rollback

If deployment causes issues:

```bash
# Via Vercel CLI
vercel rollback

# Or revert code and re-push
git revert <commit-hash>
git push origin main
```

## Next Steps

1. Deploy to Vercel using one of the methods above
2. Test all dashboard functionality
3. Verify AI Assistant with Gemini API
4. Monitor performance and logs
5. Set up CI/CD pipeline if needed

## Support

- Vercel Docs: https://vercel.com/docs
- TanStack Start: https://tanstack.com/start
- Nitro: https://nitro.unjs.io/
- Gemini API: https://developers.google.com/generative-ai
