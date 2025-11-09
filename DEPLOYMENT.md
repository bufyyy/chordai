# ChordAI Deployment Guide

Complete guide for deploying ChordAI to production.

---

## 🚀 Quick Deploy

### Option A: Vercel (Recommended - 5 minutes)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# Follow prompts, done!
```

### Option B: Netlify (5 minutes)

```bash
# 1. Install Netlify CLI
npm i -g netlify-cli

# 2. Deploy
netlify deploy --prod

# Follow prompts, done!
```

---

## 📋 Pre-Deployment Checklist

### Required Steps

- [ ] All tests passing (`npm run test`)
- [ ] Lint check passed (`npm run lint`)
- [ ] Production build works (`npm run build`)
- [ ] Model files present in `client/public/model/`
- [ ] Environment variables configured
- [ ] Git repository initialized
- [ ] Code pushed to GitHub

### Optional Steps

- [ ] Custom domain ready
- [ ] Analytics configured
- [ ] Error tracking (Sentry) setup
- [ ] SSL certificate (automatic with Vercel/Netlify)

---

## 🔧 Detailed Deployment Steps

### 1. Build Optimization

#### Check Build Size
```bash
cd client
npm run build
du -sh dist/
```

**Target Sizes:**
- Total bundle: < 1 MB (without model)
- With model: < 5 MB
- Main JS: < 500 KB
- CSS: < 50 KB

#### Optimize if Needed
```javascript
// vite.config.js already configured with:
- Code splitting
- Tree shaking
- Minification
- Compression
```

---

### 2. Vercel Deployment

#### A. Web UI (Easiest)

1. **Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/chordai.git
git push -u origin main
```

2. **Connect to Vercel:**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Framework Preset: Vite
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Click "Deploy"

3. **Done!** Your app is live at `https://your-project.vercel.app`

#### B. CLI Method

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd /path/to/chordai
vercel

# Production deploy
vercel --prod
```

#### C. Environment Variables

In Vercel Dashboard:
```
Settings > Environment Variables

Add:
VITE_APP_NAME = ChordAI
VITE_APP_VERSION = 1.0.0
NODE_ENV = production
```

---

### 3. Netlify Deployment

#### A. Web UI

1. **Push to GitHub** (same as above)

2. **Connect to Netlify:**
   - Go to https://netlify.com
   - Click "Add new site"
   - Choose "Import an existing project"
   - Select GitHub repository
   - Base directory: `client`
   - Build command: `npm run build`
   - Publish directory: `client/dist`
   - Click "Deploy site"

3. **Done!** Your app is live at `https://your-app.netlify.app`

#### B. CLI Method

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Initialize site
cd /path/to/chordai
netlify init

# Deploy
netlify deploy --prod
```

---

### 4. GitHub Pages (Free, Simple)

```bash
# Add gh-pages package
cd client
npm install --save-dev gh-pages

# Add deploy script to package.json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}

# Deploy
npm run deploy
```

**Access at:** `https://YOUR_USERNAME.github.io/chordai`

**Note:** Update `vite.config.js`:
```javascript
export default {
  base: '/chordai/', // Your repo name
  // ...
}
```

---

## 🌐 Custom Domain Setup

### Vercel

1. Go to Project Settings > Domains
2. Add your domain (e.g., `chordai.app`)
3. Update DNS records:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
4. Wait for DNS propagation (5-30 minutes)
5. SSL automatically configured

### Netlify

1. Go to Site Settings > Domain Management
2. Add custom domain
3. Update DNS records:
   ```
   Type: CNAME
   Name: www
   Value: your-site.netlify.app
   ```
4. SSL automatically configured

---

## 🔐 Environment Variables

### Development (.env.development)
```bash
VITE_APP_NAME=ChordAI Dev
VITE_APP_VERSION=1.0.0-dev
VITE_DEBUG=true
```

### Production (.env.production)
```bash
VITE_APP_NAME=ChordAI
VITE_APP_VERSION=1.0.0
VITE_DEBUG=false
VITE_ANALYTICS_ID=G-XXXXXXXXXX
VITE_SENTRY_DSN=your-sentry-dsn
```

**Important:** Never commit `.env` files to Git!

Add to `.gitignore`:
```
.env
.env.local
.env.production
```

---

## 📊 Analytics Setup (Optional)

### Google Analytics

1. Create GA4 property at https://analytics.google.com
2. Get Measurement ID (G-XXXXXXXXXX)
3. Add to `index.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Plausible (Privacy-friendly alternative)

```html
<script defer data-domain="chordai.app" src="https://plausible.io/js/script.js"></script>
```

---

## 🐛 Error Tracking (Sentry)

### Setup

```bash
cd client
npm install @sentry/react @sentry/vite-plugin
```

### Configure

```javascript
// main.jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});

// Wrap app
<Sentry.ErrorBoundary fallback={<ErrorPage />}>
  <App />
</Sentry.ErrorBoundary>
```

---

## ⚡ Performance Optimization

### Lighthouse Targets

- Performance: > 90
- Accessibility: > 95
- Best Practices: > 95
- SEO: > 95

### Check Performance

```bash
# Install Lighthouse
npm install -g lighthouse

# Run audit
lighthouse https://your-app.vercel.app --view
```

### Optimizations Applied

✅ Code splitting
✅ Tree shaking
✅ Asset compression (Gzip/Brotli)
✅ Image optimization
✅ Lazy loading
✅ Cache headers
✅ CDN (automatic with Vercel/Netlify)

---

## 🔄 CI/CD with GitHub Actions

GitHub Actions workflow already configured in `.github/workflows/deploy.yml`

**Triggers:**
- Push to `main` branch → Deploy to production
- Pull request → Run tests only

**Steps:**
1. Run tests
2. Build app
3. Deploy to Vercel
4. Run Lighthouse
5. Send notifications

### Required Secrets

Add in GitHub repo: Settings > Secrets and variables > Actions

```
VERCEL_TOKEN          # From vercel.com/account/tokens
VERCEL_ORG_ID         # From vercel.json after first deploy
VERCEL_PROJECT_ID     # From vercel.json after first deploy
SLACK_WEBHOOK         # (Optional) For notifications
```

---

## 📦 Build Commands Reference

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# E2E tests
npm run test:e2e

# Lint
npm run lint

# Type check (if using TypeScript)
npm run type-check

# Bundle analysis
npm run build -- --mode analyze
```

---

## 🚨 Troubleshooting

### Build Fails

**Issue:** `Module not found`
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Issue:** `Out of memory`
**Solution:** Increase Node memory
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

### Model Not Loading

**Issue:** 404 on model files
**Solution:** Ensure model files are in `client/public/model/`

**Issue:** Model too large
**Solution:** Use quantized model or serve from CDN

### Slow Performance

**Issue:** Large bundle size
**Solution:**
- Check bundle with `npm run build`
- Remove unused dependencies
- Lazy load components

---

## 📈 Post-Deployment

### Monitor

- Check Vercel/Netlify Analytics
- Monitor error rates (Sentry)
- Review Lighthouse scores weekly
- Check Core Web Vitals

### Update

```bash
# Make changes
git add .
git commit -m "Update: description"
git push origin main

# Auto-deploys via CI/CD
```

### Rollback

**Vercel:**
- Go to Deployments
- Click on previous deployment
- Click "Promote to Production"

**Netlify:**
- Go to Deploys
- Click on previous deploy
- Click "Publish deploy"

---

## 🎉 Success Checklist

After deployment, verify:

- [ ] App loads at production URL
- [ ] All pages accessible
- [ ] Generate progression works
- [ ] Audio playback works
- [ ] Export functions work
- [ ] Library loads
- [ ] Settings save
- [ ] Mobile responsive
- [ ] Fast load time (<3s)
- [ ] No console errors
- [ ] Analytics tracking
- [ ] SSL/HTTPS enabled

---

## 📞 Support

- **Issues:** https://github.com/YOUR_USERNAME/chordai/issues
- **Vercel Docs:** https://vercel.com/docs
- **Netlify Docs:** https://docs.netlify.com

---

## 🔗 Quick Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Netlify Dashboard:** https://app.netlify.com
- **GitHub Actions:** https://github.com/YOUR_USERNAME/chordai/actions
- **Lighthouse:** https://pagespeed.web.dev

---

**Last Updated:** January 2025

**Deployment Time:** 5-10 minutes ⚡
