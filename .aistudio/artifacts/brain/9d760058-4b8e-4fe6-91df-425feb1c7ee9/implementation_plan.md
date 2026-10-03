# Android App Conversion: Installable PWA + Capacitor Native APK Setup & Guide

This plan equips PostNote with full **Progressive Web App (PWA)** installability on Android & iOS (`vite-plugin-pwa`, Web App Manifest, Service Worker, offline support, and one-tap **Install App** button) alongside a complete **Capacitor Android** configuration (`capacitor.config.ts`, `android:*` build scripts, and an interactive **Android APK & Mobile App Hub** inside Settings) so you can either install PostNote directly from Chrome on Android in one tap or compile a native `.apk` / `.aab` for Google Play Store distribution.

### User Review & Critical Decisions

> [!IMPORTANT]
> Confirmed choice from Phase 1:

- **Confirmed Approach**: **Add PWA support + Capacitor Android setup & APK guide**
  1. **Instant Android Install (PWA / TWA-ready)**: Configures `vite-plugin-pwa` with a standalone Web App Manifest (`display: 'standalone'`, theme color `#C44D34`, background `#FAF7F2`, 192×192, 512×512, and maskable icons), automatic Service Worker caching, and an in-app **Install App** button in the top header and Settings.
  2. **Native Android APK / Play Store Packaging (Capacitor)**: Adds `capacitor.config.ts` (`appId: 'in.firstdraftstudio.postnote'`, `appName: 'PostNote'`, `webDir: 'dist'`) and `package.json` helper scripts (`android:init`, `android:sync`, `android:open`, `android:apk`) plus an interactive **Android App & APK Builder Guide** directly in **Settings** with copyable terminal commands for Capacitor and Bubblewrap (TWA).

### 1. Overview & Core Concept

- **What It Does**:
  - Turns PostNote into a standalone mobile app with no browser address bar (`display: 'standalone'`), custom PostNote app icons, offline asset caching, and native install prompts.
  - Pre-configures Capacitor for Android so exporting or cloning the project lets you generate the native `android/` Gradle project and build a signed `.apk` or `.aab` in minutes.
  - Provides a built-in **Android & Mobile App Hub** inside **Settings** (and quick header install trigger) where you can trigger 1-click PWA installation or copy the exact CLI commands to build the Android `.apk`.
- **Target Audience / Persona**: Studio owners, team members, and clients who want PostNote installed on their Android home screen or distributed as an Android `.apk` / Google Play Store app.
- **Key Value**: Gives you immediate Android installation today via Chrome/PWA while providing zero-friction native Android Studio APK compilation via Capacitor.

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **One-Tap Android / Desktop PWA Install**:
     - When opening PostNote in Chrome on Android (or desktop), an **Install App** button appears in the top bar and inside **Settings → Android & Mobile App**.
     - Tapping **Install App** triggers the native Android install sheet and places the **PostNote** icon on the Android home screen and app drawer.
  2. **Interactive Android APK & Play Store Guide (Inside Settings)**:
     - Open **Settings** (`More → Settings`) to view the new **Android App & PWA Installation** card.
     - Switch between **Method 1: Instant Android Install (PWA)**, **Method 2: Native Android APK via Capacitor**, and **Method 3: Google Play Store TWA (Bubblewrap)** with one-click copyable commands and step-by-step instructions.
- **Visual Identity & Theme**:
  - Matches PostNote's Warm Editorial Studio palette (`#FAF7F2` cream, `#151C24` dark slate, `#C44D34` terracotta brand icon with the serif `P` monogram).

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual PWA + Capacitor Architecture**
  - *Chosen Approach*: Configure `vite-plugin-pwa` for immediate over-the-air Android installation and offline caching, and include `capacitor.config.ts` + `package.json` scripts for native Android Studio APK builds.
  - *Why*: PWA lets you and your team install the app on Android devices immediately without needing Android Studio installed, while Capacitor uses the exact same `dist/` build output to wrap the app into a native Android `.apk` or `.aab` with zero code duplication.

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     Vite Build + PWA Service Worker                        │
│  • vite-plugin-pwa generates manifest.webmanifest & sw.js                  │
│  • Public icons: icon.svg, pwa-192x192.png, pwa-512x512.png, maskable      │
└───────────────┬────────────────────────────────────────┬───────────────────┘
                │                                        │
                ▼                                        ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────┐
│     In-App PWA Install & Offline     │  │   Capacitor Android Packaging    │
│  • usePWAInstall() hook              │  │  • capacitor.config.ts           │
│  • PWAInstallButton (Header/Settings)│  │  • appId: in.firstdraftstudio... │
│  • Android APK Guide Modal/Section   │  │  • npm run android:sync / open   │
└──────────────────────────────────────┘  └──────────────────────────────────┘
```

- **Interactive Component & State Mapping**:
  - `usePWAInstall`: Captures `beforeinstallprompt`, detects standalone mode (`display-mode: standalone`), detects Android/iOS user agents, and exposes `install()`.
  - `PWAInstallButton`: Renders a compact install button in the header and a full interactive card in `SettingsView` with an expandable **Android APK Build Guide** containing copy-to-clipboard buttons for every command.
