import type { CapacitorConfig } from '@capacitor/cli';

// Production server URL — Sada deployed on Vercel
const SERVER_URL = process.env.SADA_SERVER_URL || 'https://my-project-one-lake-82.vercel.app';

const config: CapacitorConfig = {
  appId: 'app.sada.voice',
  appName: 'Sada',
  webDir: 'out',
  server: {
    url: SERVER_URL,
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0a0a0f',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
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

