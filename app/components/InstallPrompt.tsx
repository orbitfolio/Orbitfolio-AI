'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia('(display-mode: standalone)').matches;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return mq || Boolean(nav.standalone);
}

export default function InstallPrompt({ variant = 'banner' }: { variant?: 'banner' | 'button' }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* native sheet closed */
    }
    setDeferred(null);
  };

  if (installed) return null;

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={() => void install()}
        disabled={!deferred}
        className="min-h-[44px] w-full rounded-xl border border-teal-400/30 bg-teal-400/10 text-sm font-semibold text-teal-200 disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-slate-500"
      >
        Install on Android
      </button>
    );
  }

  if (hidden || !deferred) return null;

  return (
    <div className="sticky top-0 z-10 mb-4 flex items-center gap-2 rounded-2xl border border-teal-400/20 bg-[#10232a] px-3 py-3">
      <p className="min-w-0 flex-1 text-sm text-teal-100">Install Orbitfolio on Android for a full-screen app.</p>
      <button
        type="button"
        onClick={() => void install()}
        className="min-h-[40px] shrink-0 rounded-full bg-teal-400 px-3 text-xs font-semibold text-[#07201c]"
      >
        Install on Android
      </button>
      <button
        type="button"
        onClick={() => setHidden(true)}
        className="min-h-[40px] shrink-0 rounded-full px-2 text-xs text-slate-400"
        aria-label="Dismiss install banner"
      >
        Not now
      </button>
    </div>
  );
}
