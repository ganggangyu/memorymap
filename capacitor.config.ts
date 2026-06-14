import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.memorymap.app',
  appName: 'RomanticJourney',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
    allowNavigation: ['*'],
  },
  plugins: {
    Geolocation: {
      // Android-specific: request background location permission
      permissions: ['android.permission.ACCESS_FINE_LOCATION', 'android.permission.ACCESS_COARSE_LOCATION'],
    },
    Calendar: {
      // Cordova calendar plugin config
      calendarName: '浪漫旅程',
      firstDayOfWeek: 1, // Monday
    },
  },
};

export default config;
