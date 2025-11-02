# PWA Setup for Driver Dashboard

## Overview

The driver dashboard is configured as a Progressive Web App (PWA) allowing drivers to install it on their mobile devices like a native app. This provides:

- **Offline Access**: Basic functionality works without internet
- **Home Screen Install**: Adds app icon to phone home screen
- **Full Screen Experience**: Launches without browser UI
- **Fast Loading**: Cached resources load instantly
- **Push Notifications**: (Future feature)

## Security & Separation

**Important:** Drivers only have access to the driver dashboard, NOT admin modules:

1. **Separate App Identity**: Installs as "Transport Driver App"
2. **Start URL**: Opens directly at `/driver-dashboard`
3. **JWT Authentication**: Role-based access prevents admin route access
4. **Isolated Experience**: Feels like a completely separate app

## Files Structure

```
frontend/
├── public/
│   ├── manifest-driver.json       # PWA manifest for driver app
│   ├── sw-driver.js                # Service worker for offline/caching
│   └── icons/                      # App icons (see below)
│       ├── driver-icon-72.png
│       ├── driver-icon-96.png
│       ├── driver-icon-128.png
│       ├── driver-icon-144.png
│       ├── driver-icon-152.png
│       ├── driver-icon-192.png
│       ├── driver-icon-384.png
│       └── driver-icon-512.png
├── src/
│   └── components/driver/
│       ├── PWAInstallPrompt.tsx    # Install banner component
│       └── PWAMetaTags.tsx         # Dynamic meta tags
```

## Icon Requirements

Create app icons in the following sizes and save to `public/icons/`:

| Size    | Filename              | Purpose                    |
|---------|-----------------------|----------------------------|
| 72x72   | driver-icon-72.png    | Android small              |
| 96x96   | driver-icon-96.png    | Android medium             |
| 128x128 | driver-icon-128.png   | Android large              |
| 144x144 | driver-icon-144.png   | Android extra large        |
| 152x152 | driver-icon-152.png   | iOS iPad                   |
| 192x192 | driver-icon-192.png   | Android default            |
| 384x384 | driver-icon-384.png   | Android high-res           |
| 512x512 | driver-icon-512.png   | Android extra high-res     |

**Icon Design Tips:**
- Use simple, recognizable design (steering wheel, route icon, etc.)
- High contrast for visibility
- Solid background color (matching brand color)
- White or light foreground icon
- Test on both light and dark home screens

## How to Test PWA

### Development Testing

1. **Start the dev server:**
   ```bash
   cd conversion/frontend
   npm run dev
   ```

2. **Access on mobile device:**
   - Connect phone to same WiFi network
   - Visit: `http://[YOUR_IP]:5175/driver-dashboard`
   - Replace `[YOUR_IP]` with your computer's local IP

3. **Test install prompt:**
   - Should see install banner at bottom of screen
   - Tap "Install" to add to home screen
   - App icon appears on phone

### Production Testing

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Serve the build:**
   ```bash
   npm run preview
   ```

3. **Important:** PWA requires HTTPS in production
   - Service workers only work on HTTPS or localhost
   - Use SSL certificate in production deployment

## Browser Support

| Browser           | Install Support | Offline Support |
|-------------------|-----------------|-----------------|
| Chrome (Android)  | ✅              | ✅              |
| Safari (iOS)      | ✅              | ✅              |
| Samsung Internet  | ✅              | ✅              |
| Firefox (Android) | ✅              | ⚠️ Limited     |
| Edge (Mobile)     | ✅              | ✅              |

## Installation Flow

### Android (Chrome)

1. Visit driver dashboard on mobile browser
2. Banner appears: "Install Driver App"
3. Tap "Install" or use browser menu → "Add to Home Screen"
4. App icon added to home screen
5. Tap icon → launches full-screen driver app

### iOS (Safari)

1. Visit driver dashboard in Safari
2. Tap Share button (square with arrow)
3. Scroll and tap "Add to Home Screen"
4. Edit name if desired, tap "Add"
5. App icon added to home screen
6. Tap icon → launches driver app

## Features

### Offline Functionality

The service worker caches:
- Driver dashboard UI
- Recent schedule data
- Trip information
- Static assets (CSS, JS, images)

**What works offline:**
- View cached schedules
- View trip history
- View emergency contacts
- View documents (if previously loaded)

**What requires internet:**
- Loading new schedules
- Submitting forms (holiday requests, safeguarding reports)
- Updating trip status
- Real-time data refresh

### Install Prompt

- Shows automatically when PWA criteria are met
- Can be dismissed for 7 days
- Reappears after 7 days if not installed
- Hides permanently once installed

### Customization

**Brand Colors** (edit `manifest-driver.json`):
```json
{
  "theme_color": "#3b82f6",      // Browser address bar color
  "background_color": "#ffffff"   // Splash screen background
}
```

**App Name**:
```json
{
  "name": "Transport Driver App",
  "short_name": "Driver"
}
```

**Start URL**:
```json
{
  "start_url": "/driver-dashboard"
}
```

## Deployment Checklist

- [ ] Generate all required icon sizes
- [ ] Place icons in `public/icons/` directory
- [ ] Test manifest loads correctly (`/manifest-driver.json`)
- [ ] Test service worker registers (`/sw-driver.js`)
- [ ] Verify HTTPS enabled in production
- [ ] Test install prompt on Android Chrome
- [ ] Test install on iOS Safari
- [ ] Verify offline functionality
- [ ] Check authentication still works after install
- [ ] Ensure drivers can't access admin routes

## Troubleshooting

### Install Prompt Not Showing

**Possible causes:**
1. Already installed
2. Not served over HTTPS (except localhost)
3. Manifest or service worker not loading
4. Browser doesn't support PWA
5. Dismissed recently (7-day cooldown)

**Debug steps:**
1. Open Chrome DevTools → Application tab
2. Check "Manifest" section for errors
3. Check "Service Workers" for registration
4. View Console for errors

### Service Worker Not Registering

**Check:**
1. File exists at `/sw-driver.js`
2. Served over HTTPS or localhost
3. No JavaScript errors in console
4. Browser supports service workers

### Offline Mode Not Working

**Check:**
1. Service worker successfully installed
2. Resources cached in Application → Cache Storage
3. Network tab shows "(from service worker)" for cached resources

## Future Enhancements

- [ ] Push notifications for new trips
- [ ] Background sync for offline status updates
- [ ] Periodic background sync for schedule updates
- [ ] Biometric authentication
- [ ] Geolocation for automatic trip check-in
- [ ] Camera integration for proof of delivery

## Support

For issues or questions about PWA setup:
- Check browser console for errors
- Verify manifest.json is valid JSON
- Test service worker registration
- Ensure HTTPS in production
