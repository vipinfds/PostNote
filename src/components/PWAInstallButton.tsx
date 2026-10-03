import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  CheckCircle2,
  Copy,
  Check,
  Terminal,
  X,
  WifiOff,
  Share2,
} from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'card';
  isDark?: boolean;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      id="pwa-offline-indicator"
      className="fixed bottom-20 lg:bottom-5 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline Mode — Using cached studio data</span>
    </div>
  );
};

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  isDark,
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } =
    usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<
    'pwa' | 'capacitor' | 'twa'
  >('pwa');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd).catch(() => {});
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  if (variant === 'header') {
    if (isInstalled) return null;

    return (
      <>
        <button
          id="header-install-app-btn"
          type="button"
          onClick={async () => {
            if (isInstallable) {
              await install();
            } else {
              setShowGuideModal(true);
            }
          }}
          className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
            isDark
              ? 'bg-[#1D242C] border-[#2C3744] text-stone-200 hover:border-[#C44D34]'
              : 'bg-white border-[#E5DFD3] text-stone-800 hover:border-[#C44D34] shadow-2xs'
          }`}
          title="Install PostNote as an Android / Mobile App"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#C44D34] shrink-0" />
          <span className="hidden sm:inline">
            {isInstallable ? 'Install App' : 'Android App'}
          </span>
        </button>

        {showGuideModal && (
          <AndroidInstallModal
            isDark={isDark}
            isInstallable={isInstallable}
            isIOS={isIOS}
            isAndroid={isAndroid}
            onInstall={install}
            activeTab={activeGuideTab}
            setActiveTab={setActiveGuideTab}
            copiedCmd={copiedCmd}
            onCopy={handleCopyCommand}
            onClose={() => setShowGuideModal(false)}
          />
        )}
      </>
    );
  }

  // Full Card Variant for SettingsView
  return (
    <div
      id="settings-android-pwa-card"
      className={`p-4 sm:p-5 rounded-2xl border shadow-xs transition-colors ${
        isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#C44D34]/15 text-[#C44D34] flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Android App &amp; Mobile Installation
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
              Install directly on Android/iOS or compile a native Android APK / Play Store bundle
            </p>
          </div>
        </div>

        {isInstalled ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Installed on Device</span>
          </span>
        ) : isInstallable ? (
          <button
            type="button"
            onClick={install}
            className="px-4 py-2 rounded-xl bg-[#C44D34] hover:bg-[#A93E27] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App Now</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#181E24] dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Open Android APK Guide</span>
          </button>
        )}
      </div>

      {/* Segmented Tabs inside Settings Card */}
      <div
        className={`grid grid-cols-3 gap-1 p-1 rounded-xl border mb-3 ${
          isDark
            ? 'bg-[#151C24] border-[#26313E]'
            : 'bg-[#FAF8F5] border-[#EAE4DA]'
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveGuideTab('pwa')}
          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
            activeGuideTab === 'pwa'
              ? 'bg-[#C44D34] text-white'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          1. Instant Install (PWA)
        </button>
        <button
          type="button"
          onClick={() => setActiveGuideTab('capacitor')}
          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
            activeGuideTab === 'capacitor'
              ? 'bg-[#C44D34] text-white'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          2. Native APK (Capacitor)
        </button>
        <button
          type="button"
          onClick={() => setActiveGuideTab('twa')}
          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
            activeGuideTab === 'twa'
              ? 'bg-[#C44D34] text-white'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          3. Play Store (TWA)
        </button>
      </div>

      {activeGuideTab === 'pwa' && (
        <div
          className={`p-3.5 rounded-xl border text-xs space-y-2 ${
            isDark
              ? 'bg-[#151C24] border-[#26313E] text-stone-300'
              : 'bg-[#FAF8F5] border-[#EAE4DA] text-stone-700'
          }`}
        >
          <p className="font-bold text-stone-900 dark:text-white">
            Install on Android Phone or Tablet (No APK Build Needed):
          </p>
          <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
            <li>
              Open your shared or deployed PostNote URL in <strong>Google Chrome</strong> on Android.
            </li>
            <li>
              Tap the <strong>Install App</strong> button in the header (or tap the Chrome <strong>⋮</strong> menu → <strong>Install app / Add to Home screen</strong>).
            </li>
            <li>
              PostNote launches full-screen (`standalone` mode) from your Android app drawer with offline caching enabled.
            </li>
          </ol>
          {isIOS && (
            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 text-[11px]">
              <strong>On iPhone / iPad (Safari):</strong> Tap{' '}
              <Share2 className="w-3 h-3 inline mx-0.5" /> <strong>Share</strong> →{' '}
              <strong>Add to Home Screen</strong>.
            </div>
          )}
        </div>
      )}

      {activeGuideTab === 'capacitor' && (
        <div
          className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
            isDark
              ? 'bg-[#151C24] border-[#26313E] text-stone-300'
              : 'bg-[#FAF8F5] border-[#EAE4DA] text-stone-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#C44D34]" />
              <span>Build Native Android `.apk` / `.aab` (Pre-configured in `capacitor.config.ts`)</span>
            </span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            Export or clone this project to your computer with Android Studio installed, then run:
          </p>
          {[
            {
              step: 'Step 1: Install Capacitor & create Android project',
              cmd: 'npm run android:setup',
            },
            {
              step: 'Step 2: Sync latest web build into Android folder',
              cmd: 'npm run android:sync',
            },
            {
              step: 'Step 3: Open in Android Studio to build APK / AAB',
              cmd: 'npm run android:open',
            },
          ].map((item) => (
            <div key={item.cmd} className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {item.step}
              </span>
              <div
                className={`flex items-center justify-between px-3 py-2 rounded-lg border font-mono text-[11px] ${
                  isDark
                    ? 'bg-[#0F141A] border-stone-800 text-emerald-400'
                    : 'bg-stone-900 border-stone-800 text-emerald-300'
                }`}
              >
                <span className="truncate">{item.cmd}</span>
                <button
                  type="button"
                  onClick={() => handleCopyCommand(item.cmd)}
                  className="ml-2 p-1 rounded hover:bg-white/10 text-stone-300 cursor-pointer shrink-0"
                  title="Copy command"
                >
                  {copiedCmd === item.cmd ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeGuideTab === 'twa' && (
        <div
          className={`p-3.5 rounded-xl border text-xs space-y-2 ${
            isDark
              ? 'bg-[#151C24] border-[#26313E] text-stone-300'
              : 'bg-[#FAF8F5] border-[#EAE4DA] text-stone-700'
          }`}
        >
          <p className="font-bold text-stone-900 dark:text-white">
            Package Live URL into an Android APK via Google Bubblewrap (TWA):
          </p>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            Because PostNote now ships a compliant Web App Manifest (`/manifest.webmanifest`), you can wrap your deployed URL directly into a Play Store `.aab` or `.apk`:
          </p>
          <div
            className={`flex items-center justify-between px-3 py-2 rounded-lg border font-mono text-[11px] ${
              isDark
                ? 'bg-[#0F141A] border-stone-800 text-emerald-400'
                : 'bg-stone-900 border-stone-800 text-emerald-300'
            }`}
          >
            <span className="truncate">
              npx @bubblewrap/cli init --manifest=/manifest.webmanifest &amp;&amp; npx @bubblewrap/cli build
            </span>
            <button
              type="button"
              onClick={() =>
                handleCopyCommand(
                  'npx @bubblewrap/cli init --manifest=/manifest.webmanifest && npx @bubblewrap/cli build'
                )
              }
              className="ml-2 p-1 rounded hover:bg-white/10 text-stone-300 cursor-pointer shrink-0"
            >
              {copiedCmd?.includes('bubblewrap') ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {showGuideModal && (
        <AndroidInstallModal
          isDark={isDark}
          isInstallable={isInstallable}
          isIOS={isIOS}
          isAndroid={isAndroid}
          onInstall={install}
          activeTab={activeGuideTab}
          setActiveTab={setActiveGuideTab}
          copiedCmd={copiedCmd}
          onCopy={handleCopyCommand}
          onClose={() => setShowGuideModal(false)}
        />
      )}
    </div>
  );
};

interface AndroidInstallModalProps {
  isDark?: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  onInstall: () => Promise<boolean>;
  activeTab: 'pwa' | 'capacitor' | 'twa';
  setActiveTab: (t: 'pwa' | 'capacitor' | 'twa') => void;
  copiedCmd: string | null;
  onCopy: (cmd: string) => void;
  onClose: () => void;
}

const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isDark,
  isInstallable,
  onInstall,
  activeTab,
  setActiveTab,
  copiedCmd,
  onCopy,
  onClose,
}) => {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-3xl border shadow-2xl p-5 space-y-4 ${
          isDark
            ? 'bg-[#1A222C] border-[#2C3949] text-stone-100'
            : 'bg-white border-[#E5DFD3] text-[#1E252B]'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#C44D34] text-white flex items-center justify-center font-serif font-bold text-base">
              P
            </div>
            <div>
              <h3 className="text-sm font-bold">
                Install PostNote on Android &amp; Mobile
              </h3>
              <p className="text-[11px] text-stone-400">
                PWA Home Screen App or Native Android APK (`in.firstdraftstudio.postnote`)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div
          className={`grid grid-cols-3 gap-1 p-1 rounded-xl border ${
            isDark
              ? 'bg-[#151C24] border-[#26313E]'
              : 'bg-[#FAF8F5] border-[#EAE4DA]'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('pwa')}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold cursor-pointer ${
              activeTab === 'pwa' ? 'bg-[#C44D34] text-white' : 'text-stone-500'
            }`}
          >
            1. Direct Android PWA
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('capacitor')}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold cursor-pointer ${
              activeTab === 'capacitor'
                ? 'bg-[#C44D34] text-white'
                : 'text-stone-500'
            }`}
          >
            2. Native APK
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('twa')}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold cursor-pointer ${
              activeTab === 'twa' ? 'bg-[#C44D34] text-white' : 'text-stone-500'
            }`}
          >
            3. Play Store TWA
          </button>
        </div>

        {activeTab === 'pwa' && (
          <div className="space-y-3 text-xs">
            <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
              PostNote is configured as a standalone Progressive Web App. You can install it immediately on any Android device without building an APK:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-stone-600 dark:text-stone-300">
              <li>
                Open the Shared App URL in <strong>Chrome on Android</strong> (outside the preview iframe).
              </li>
              <li>
                Tap <strong>Install App</strong> or open Chrome&apos;s <strong>⋮</strong> menu and tap <strong>Add to Home screen / Install app</strong>.
              </li>
              <li>
                Launch <strong>PostNote</strong> from your Android home screen in full-screen native mode.
              </li>
            </ol>
            {isInstallable && (
              <button
                type="button"
                onClick={async () => {
                  await onInstall();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-[#C44D34] text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Trigger Browser Install Prompt</span>
              </button>
            )}
          </div>
        )}

        {activeTab === 'capacitor' && (
          <div className="space-y-2.5 text-xs">
            <p className="text-stone-600 dark:text-stone-300">
              This project includes `capacitor.config.ts` (`in.firstdraftstudio.postnote`). To generate a native Android `.apk`:
            </p>
            {[
              'npm run android:setup',
              'npm run android:sync',
              'npm run android:open',
            ].map((cmd) => (
              <div
                key={cmd}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-900 text-emerald-300 font-mono text-[11px]"
              >
                <span>{cmd}</span>
                <button
                  type="button"
                  onClick={() => onCopy(cmd)}
                  className="p-1 text-stone-300 hover:text-white cursor-pointer"
                >
                  {copiedCmd === cmd ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
            <p className="text-[11px] text-stone-400">
              In Android Studio, click <strong>Build → Build Bundle(s) / APK(s) → Build APK(s)</strong> to export your installable `.apk`.
            </p>
          </div>
        )}

        {activeTab === 'twa' && (
          <div className="space-y-2.5 text-xs">
            <p className="text-stone-600 dark:text-stone-300">
              Use Google&apos;s Bubblewrap CLI to wrap your deployed PostNote PWA into a Play Store Trusted Web Activity (`.aab` &amp; `.apk`):
            </p>
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-900 text-emerald-300 font-mono text-[11px]">
              <span className="truncate">
                npx @bubblewrap/cli init --manifest=/manifest.webmanifest
              </span>
              <button
                type="button"
                onClick={() =>
                  onCopy('npx @bubblewrap/cli init --manifest=/manifest.webmanifest')
                }
                className="p-1 text-stone-300 hover:text-white cursor-pointer"
              >
                {copiedCmd?.includes('bubblewrap') ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
