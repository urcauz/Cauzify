# 🚀 Cauzify Quick Start Guide

## Get Up and Running in 3 Minutes

### Step 1: Serve the Files (Choose one method)

**Option A: Python** (easiest if you have Python installed)
```bash
cd cauzify
python -m http.server 8080
```

**Option B: Node.js**
```bash
cd cauzify
npx serve -p 8080
```

**Option C: PHP**
```bash
cd cauzify
php -S localhost:8080
```

### Step 2: Open in Browser
```
http://localhost:8080
```

### Step 3: Connect to Navidrome

1. Enter your Navidrome server URL
   - Example: `http://192.168.1.100:4533`
   - Or: `https://music.yourdomain.com`

2. Enter your username and password

3. Click "Connect"

4. Start enjoying your music! 🎵

---

## 📱 Install as PWA (Optional but Recommended)

### On Desktop (Chrome/Edge):
1. Look for install icon in address bar (⊕)
2. Click "Install Cauzify"
3. App opens in standalone window

### On Mobile (Android):
1. Tap menu (⋮) → "Add to Home screen"
2. App appears on home screen

### On iOS/Safari:
1. Tap Share button
2. Tap "Add to Home Screen"
3. App appears on home screen

---

## 🎯 What Works Right Now

✅ Browse albums, songs, artists
✅ Search your entire library
✅ Play/pause/skip controls
✅ Queue management
✅ Shuffle & repeat
✅ Offline caching (once installed)
✅ Lock screen controls
✅ Favorite tracks

---

## 🐛 Troubleshooting

### "Can't connect to server"
- Check Navidrome is running: `http://your-server:4533`
- Include `http://` or `https://` in URL
- Try server IP instead of hostname

### "Install App" button missing
- Use Chrome, Edge, or Safari
- Ensure you're on localhost OR HTTPS
- Clear browser cache and reload

### Music won't play
- Check browser console (F12)
- Verify audio format is supported
- Try different browser

### Still stuck?
Check the full README.md for detailed troubleshooting

---

## 🎉 You're All Set!

Enjoy your self-hosted music streaming experience!

**Pro Tips:**
- Add to favorites for quick access
- Enable shuffle for discovery
- Check settings for cache management
- Use queue to build playlists on the fly
