# Deploy to GitHub Pages (Simple)

## Step 1: Create GitHub Repository
1. Go to https://github.com/new
2. Name it: `cs2-info-grabber`
3. Click "Create repository"

## Step 2: Push Code to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/menacheats/cs2-info-grabber.git
git push -u origin main
```

## Step 3: Enable GitHub Pages
1. Go to https://github.com/menacheats/cs2-info-grabber
2. Click "Settings"
3. Click "Pages" (left sidebar)
4. Under "Source", select "Deploy from a branch"
5. Select branch: `main`
6. Select folder: `public`
7. Click "Save"

## Step 4: Wait & Access
- Wait 1-2 minutes
- Your site will be at: **https://menacheats.github.io/cs2-info-grabber**

## That's it!
Your app is now live on GitHub Pages.

---

## Add Your Steam API Key

1. Edit `public/standalone.html`
2. Find this line:
   ```javascript
   const STEAM_API_KEY = 'YOUR_API_KEY_HERE';
   ```
3. Replace with your actual Steam API key:
   ```javascript
   const STEAM_API_KEY = '4E7D37B3F41A1140133A63761C5B71C9';
   ```
4. Save and push to GitHub:
   ```bash
   git add .
   git commit -m "Add API key"
   git push
   ```

Your site will update automatically!
