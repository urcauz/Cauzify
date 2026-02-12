# 🎵 Cauzify - PWA Music Player

A beautiful, mobile-first Progressive Web App for streaming music from Navidrome servers.

## ✨ Features

### 🎨 User Interface
- **Modern Design**: Glassmorphism UI with smooth gradients and animations
- **Mobile-First**: Optimized for touch interactions and mobile screens
- **Dark Theme**: Easy on the eyes with purple accent colors
- **Responsive**: Works on phones, tablets, and desktop

### 🎵 Music Features
- **Library Browsing**: Browse albums, songs, and artists
- **Search**: Fast search across your entire library
- **Queue Management**: View and control your playback queue
- **Playback Controls**: Play, pause, skip, shuffle, repeat
- **Favorites**: Star your favorite tracks
- **Scrobbling**: Last.fm integration via Navidrome

### 📱 PWA Capabilities
- **Offline Support**: Service worker caches assets for offline use
- **Install to Home Screen**: Works like a native app
- **Background Audio**: Continues playing when app is minimized
- **Media Session API**: Control playback from lock screen/notifications
- **Network Detection**: Shows online/offline status
- **Cache Management**: View and clear cached data

## 🚀 Installation

### Prerequisites
- A running [Navidrome](https://www.navidrome.org/) server
- Modern web browser (Chrome, Firefox, Safari, Edge)
- HTTPS connection (required for PWA features) OR localhost

### Quick Start

1. **Download the files**
   ```bash
   git clone <repository-url>
   cd cauzify
   ```

2. **Serve the files**
   
   Option A - Using Python:
   ```bash
   python -m http.server 8080
   ```
   
   Option B - Using Node.js:
   ```bash
   npx serve -p 8080
   ```
   
   Option C - Using PHP:
   ```bash
   php -S localhost:8080
   ```

3. **Open in browser**
   ```
   http://localhost:8080
   ```

4. **Connect to Navidrome**
   - Enter your Navidrome server URL (e.g., `http://192.168.1.10:4533`)
   - Enter your username and password
   - Click "Connect"

5. **Install as PWA** (Optional)
   - Click the "📱 Install App" button
   - Or use browser's install prompt
   - App will be added to your home screen

## 📂 Project Structure

```
cauzify/
├── index.html          # Main HTML file
├── styles.css          # All CSS styles
├── app.js             # Application logic
├── sw.js              # Service Worker for PWA
├── manifest.json      # PWA manifest
├── icons/             # App icons (create these)
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png
│   ├── icon-384.png
│   └── icon-512.png
└── README.md          # This file
```

## 🎨 Creating Icons

You need to create icons for the PWA. Here are the required sizes:

- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

### Quick Icon Generation

Use an online tool like [PWA Image Generator](https://www.pwabuilder.com/imageGenerator) or create them manually:

1. Create a 512x512 source image with your logo
2. Use ImageMagick to resize:
   ```bash
   mkdir icons
   convert source.png -resize 72x72 icons/icon-72.png
   convert source.png -resize 96x96 icons/icon-96.png
   convert source.png -resize 128x128 icons/icon-128.png
   convert source.png -resize 144x144 icons/icon-144.png
   convert source.png -resize 152x152 icons/icon-152.png
   convert source.png -resize 192x192 icons/icon-192.png
   convert source.png -resize 384x384 icons/icon-384.png
   convert source.png -resize 512x512 icons/icon-512.png
   ```

Or use this simple SVG as a placeholder (save as icon.svg and convert to PNG):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#c084fc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#818cf8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="20" fill="url(#grad)"/>
  <text x="50" y="65" font-size="50" text-anchor="middle" fill="white">🎵</text>
</svg>
```

## 🔧 Configuration

### Cache Settings

Edit `sw.js` to customize caching behavior:

```javascript
const CACHE_VERSION = 'cauzify-v1.0';  // Change to force cache update
const CACHE_STATIC = 'cauzify-static-v1';
const CACHE_DYNAMIC = 'cauzify-dynamic-v1';
const CACHE_IMAGES = 'cauzify-images-v1';
```

### App Settings

Edit `manifest.json` to customize:
- App name and description
- Theme colors
- Display mode
- Orientation

## 🌐 Deployment

### Deploy to Production

For production deployment with HTTPS (required for full PWA features):

#### Option 1: Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

#### Option 2: Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Option 3: GitHub Pages
1. Push to GitHub repository
2. Go to Settings → Pages
3. Select source branch
4. Your site will be at `https://username.github.io/cauzify`

#### Option 4: Self-hosted
1. Copy files to web server
2. Configure HTTPS (use Let's Encrypt)
3. Point domain to server

### HTTPS Requirements

PWA features require HTTPS. Options:
- Use free SSL from [Let's Encrypt](https://letsencrypt.org/)
- Deploy to services with built-in HTTPS (Netlify, Vercel, etc.)
- Use Cloudflare for SSL proxy
- **Exception**: localhost works without HTTPS for development

## 🔐 Security Notes

### Current Implementation
- Passwords stored in localStorage for convenience
- MD5 token authentication (Subsonic API standard)
- Session token for auto-reconnect

### Recommendations for Production
1. **Use HTTPS**: Always deploy with SSL/TLS
2. **Short Sessions**: Implement session timeout
3. **Secure Storage**: Consider IndexedDB with encryption
4. **Content Security Policy**: Add CSP headers
5. **Input Validation**: Server-side validation on Navidrome

### Privacy
- All data stays between your browser and Navidrome server
- No third-party analytics or tracking
- Credentials only sent to your specified server

## 🐛 Troubleshooting

### "Install App" button doesn't appear
- Ensure you're using HTTPS (or localhost)
- Check browser console for errors
- Try different browser (Chrome/Edge have best PWA support)

### Music won't play
- Check Navidrome server is accessible
- Verify URL in settings (should include `http://` or `https://`)
- Check browser console for CORS errors
- Ensure audio files are in supported format

### Offline mode not working
- Service worker requires HTTPS
- Check Application tab in DevTools
- Verify service worker is registered
- Clear cache and reload

### Poor performance
- Clear browser cache
- Reduce number of cached images
- Check network connection
- Close other browser tabs

## 📱 Browser Support

| Browser | Version | PWA Install | Offline | Media Session |
|---------|---------|-------------|---------|---------------|
| Chrome  | 80+     | ✅          | ✅      | ✅            |
| Edge    | 80+     | ✅          | ✅      | ✅            |
| Safari  | 14+     | ✅*         | ✅      | ✅            |
| Firefox | 90+     | ⚠️          | ✅      | ✅            |

*Safari on iOS: Add to Home Screen works differently

## 🎯 Roadmap

- [ ] Playlist management
- [ ] Download for offline playback
- [ ] Equalizer settings
- [ ] Lyrics display
- [ ] Social features (share tracks)
- [ ] Advanced search filters
- [ ] Podcast support
- [ ] Multi-server support

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use and modify

## 🙏 Credits

- **Subsonic API**: Music server protocol
- **Navidrome**: Modern music server
- **Fonts**: Syne & DM Mono from Google Fonts
- **MD5.js**: blueimp-md5 library

## 📞 Support

- Report bugs via GitHub Issues
- Check [Navidrome Docs](https://www.navidrome.org/docs/) for server setup
- Join [Navidrome Discord](https://discord.gg/xh7j7yF) for community support

---

**Enjoy your music! 🎵**
