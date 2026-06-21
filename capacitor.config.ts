import type { CapacitorConfig } from '@capacitor/cli';

// For production: set this to your deployed server URL
// For local dev: use http://10.0.2.2:3000 (Android emulator) or http://192.168.x.x:3000 (real device)
const SERVER_URL = process.env.SADA_SERVER_URL || 'http://10.0.2.2:3000';

const config: CapacitorConfig = {
  appId: 'app.sada.voice',
  appName: 'Sada',
  // For server-based: use server.url
  // For bundled offline: use webDir: './out'
  webDir: 'out',
  server: {
    url: SERVER_URL,
    cleartext: true,
    androidScheme: 'http',
  },
  android: {
    backgroundColor: '#0a0a0f',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0a0a0f',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#8b5cf6',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0f',
      overlaysWebView: false,
    },
  },
};

export default config;
