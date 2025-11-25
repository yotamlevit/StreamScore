# StreamScore - Quick Start Guide

## Getting Your API Key

1. Go to: https://www.omdbapi.com/apikey.aspx
2. Select "FREE" (1,000 daily requests)
3. Enter your email
4. Check email and **click activation link** (important!)
5. Copy your API key

## Installing the Extension

### Chrome / Edge / Brave

1. Open browser and go to:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`

2. Enable **Developer mode** (toggle in top-right)

3. Click **Load unpacked**

4. Select folder: `/Users/yotamlevit/Code/StreamScore`

## Configuring the Extension

1. Click the **StreamScore icon** in your toolbar
2. Paste your API key
3. Click **Save Settings**
4. Wait for green ✓ indicator

## Using StreamScore

1. Go to **Netflix**, **Disney+**, **Apple TV+**, or **Prime Video**
2. Browse to any movie or show **preview/details page**
3. StreamScore widget automatically appears with ratings!

### Important URLs to Test:

**Netflix:**
- Browse and select any title
- URL will be: `netflix.com/browse?jbv=...` or `netflix.com/title/...`

**Disney+:**
- Click on any content to see details

**Apple TV+:**
- Navigate to show: `tv.apple.com/us/show/...`
- Or movie: `tv.apple.com/us/movie/...`

## Widget Features

📊 **Displays:**
- IMDb rating (out of 10)
- Rotten Tomatoes critic score
- Direct links to IMDb and RT

🎨 **Interactive:**
- Click × to dismiss
- Click links to open full pages
- Auto-updates when you navigate

## Troubleshooting

**Widget not showing?**
- Make sure you're on a title preview/details page (not homepage)
- Check API key is saved (click extension icon)
- Try refreshing the page

**Invalid API Key?**
- Make sure you clicked the activation link in your email
- Check for typos
- Try generating a new key

**Need help?**
- Press F12 to open console
- Look for `[StreamScore]` logs
- Check the walkthrough.md for detailed testing guide

## File Structure

```
StreamScore/
├── manifest.json       # Extension config
├── background.js       # API service
├── content/            # Content scripts
├── popup/              # Settings UI
└── icons/              # Extension icons
```

## Next Steps

1. Install extension (see above)
2. Configure API key
3. Test on Netflix
4. Enjoy informed streaming! 🎬

---

**Pro Tip:** The extension caches ratings for 24 hours to save API requests, so you can browse freely without worrying about the daily limit!
