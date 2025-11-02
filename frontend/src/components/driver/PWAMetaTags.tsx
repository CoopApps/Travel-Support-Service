import { useEffect } from 'react';

/**
 * PWA Meta Tags Component
 *
 * Dynamically adds PWA-specific meta tags to the document head
 * Only loads when driver dashboard is active
 */
function PWAMetaTags() {
  useEffect(() => {
    // Add manifest link
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest-driver.json';
    document.head.appendChild(manifestLink);

    // Add theme color
    const themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    themeColor.content = '#3b82f6';
    document.head.appendChild(themeColor);

    // Add apple-mobile-web-app-capable
    const appleCapable = document.createElement('meta');
    appleCapable.name = 'apple-mobile-web-app-capable';
    appleCapable.content = 'yes';
    document.head.appendChild(appleCapable);

    // Add apple-mobile-web-app-status-bar-style
    const appleStatusBar = document.createElement('meta');
    appleStatusBar.name = 'apple-mobile-web-app-status-bar-style';
    appleStatusBar.content = 'default';
    document.head.appendChild(appleStatusBar);

    // Add apple-mobile-web-app-title
    const appleTitle = document.createElement('meta');
    appleTitle.name = 'apple-mobile-web-app-title';
    appleTitle.content = 'Driver App';
    document.head.appendChild(appleTitle);

    // Add apple touch icons
    const appleTouchIcon = document.createElement('link');
    appleTouchIcon.rel = 'apple-touch-icon';
    appleTouchIcon.href = '/icons/driver-icon-192.png';
    document.head.appendChild(appleTouchIcon);

    // Add mobile-web-app-capable for Chrome
    const mobileCapable = document.createElement('meta');
    mobileCapable.name = 'mobile-web-app-capable';
    mobileCapable.content = 'yes';
    document.head.appendChild(mobileCapable);

    // Add description
    const description = document.createElement('meta');
    description.name = 'description';
    description.content = 'Driver dashboard for managing trips and schedules';
    document.head.appendChild(description);

    // Update page title
    document.title = 'Driver Dashboard';

    // Cleanup function
    return () => {
      document.head.removeChild(manifestLink);
      document.head.removeChild(themeColor);
      document.head.removeChild(appleCapable);
      document.head.removeChild(appleStatusBar);
      document.head.removeChild(appleTitle);
      document.head.removeChild(appleTouchIcon);
      document.head.removeChild(mobileCapable);
      document.head.removeChild(description);
      document.title = 'Travel Support System';
    };
  }, []);

  return null;
}

export default PWAMetaTags;
