/**
 * Capacitor Android & iOS Configuration for PostNote Studio
 *
 * Quick Start to Build Native Android APK / AAB:
 * 1. npm install @capacitor/core @capacitor/cli @capacitor/android
 * 2. npm run build
 * 3. npx cap add android
 * 4. npx cap sync android
 * 5. npx cap open android   (Opens Android Studio -> Build -> Build Bundle(s) / APK(s) -> Build APK(s))
 */
const config = {
  appId: 'in.firstdraftstudio.postnote',
  appName: 'PostNote',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: '#FAF7F2',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#FAF7F2',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
