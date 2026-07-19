import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.digixcrm.app',
  appName: 'DigiXCrm',
  webDir: 'public',
  server: {
    url: 'https://digixcrm.com',
    cleartext: true,
    androidScheme: 'https',
    errorPath: 'offline.html'
  },
  // @ts-ignore - Required for server-side identity detection
  overrideUserAgent: 'DigiXCrm-Capacitor-Mobile',
  android: {
    backgroundColor: '#0d1b4b'
  }
};

export default config;
