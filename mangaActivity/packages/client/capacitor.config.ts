import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kdonohoue.manga',
  appName: 'Manga Tracker',
  webDir: 'dist',
  server: {
    // Set the custom URL scheme (this is the URL you'll use to detect and open the app)
    url: "https://devmanga.kdonohoue.com",
    androidScheme: "https",  // Scheme for Android
  },
  plugins: {
  }
};

export default config;
