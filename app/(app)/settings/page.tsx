'use client';

import { useRef, useState } from 'react';
import AppShell from '@/app/components/AppShell';
import InstallPrompt from '@/app/components/InstallPrompt';
import Card from '@/app/components/Card';
import ThemeToggle from '@/app/components/ThemeToggle';
import { useThemeStore } from '@/lib/theme-store';
import { parseHoldingsJson, serializeHoldingsJson } from '@/lib/holdings/json';
import { useHoldingsStore } from '@/lib/store/holdings';

const hasSupabase =
  typeof process !== 'undefined' && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export default function SettingsPage() {
  const displayCurrency = useHoldingsStore((s) => s.displayCurrency);
  const setDisplayCurrency = useHoldingsStore((s) => s.setDisplayCurrency);
  const holdings = useHoldingsStore((s) => s.holdings);
  const replaceHoldings = useHoldingsStore((s) => s.replaceHoldings);
  const clearHoldings = useHoldingsStore((s) => s.clearHoldings);
  const fileRef = useRef<HTMLInputElement>(null);
  const [ioNote, setIoNote] = useState<string | null>(null);

  const exportHoldings = () => {
    const body = serializeHoldingsJson(holdings);
    const blob = new Blob([body], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orbitfolio-holdings.json';
    a.click();
    URL.revokeObjectURL(url);
    setIoNote(`Exported ${holdings.length} holding${holdings.length === 1 ? '' : 's'} from this device.`);
  };

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseHoldingsJson(text);
      if (parsed.error || parsed.holdings.length === 0) {
        setIoNote(parsed.error || 'No valid holdings in file');
        return;
      }
      replaceHoldings(parsed.holdings);
      setIoNote(`Imported ${parsed.holdings.length} holding${parsed.holdings.length === 1 ? '' : 's'} onto this device.`);
    } catch {
      setIoNote('Could not read that file.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onClear = () => {
    if (!window.confirm('Clear all holdings stored on this device? This cannot be undone.')) return;
    clearHoldings();
    setIoNote('Holdings cleared on this device.');
  };

  const themeChoice = useThemeStore((s) => s.choice);

  return (
    <AppShell title="Settings">
      <Card>
        <p className="text-xs uppercase tracking-wide text-ink-muted">Mode</p>
        <p className="mt-1 text-sm text-ink">Demo · localStorage · this device only</p>
        <p className="mt-1 text-xs text-ink-faint">
          Holdings live in this browser on this device. No login required.
          {hasSupabase ? ' Connected accounts can use /api/holdings when a session exists.' : ''}
        </p>
      </Card>

      <Card className="mt-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-ink-muted">Holdings JSON</p>
        <p className="text-xs text-ink-faint">
          Export, replace, or clear the demo list stored on this device only. Importing replaces
          the current list.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={exportHoldings}
            className="min-h-[44px] rounded-xl border border-line/15 text-sm text-ink-soft"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="min-h-[44px] rounded-xl border border-line/15 text-sm text-ink-soft"
          >
            Import
          </button>
          <button
            type="button"
            onClick={onClear}
            className="min-h-[44px] rounded-xl border border-rose-400/25 text-sm text-rose-300"
          >
            Clear
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => void onImportFile(e.target.files?.[0])}
        />
        {ioNote ? <p className="mt-3 text-xs text-accent-bright">{ioNote}</p> : null}
      </Card>

      <Card className="mt-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-ink-muted">Theme</p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-secondary">
            {themeChoice === 'system' ? 'Matching your system' : themeChoice === 'light' ? 'Light' : 'Dark'}
          </p>
          <ThemeToggle />
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          System follows your device appearance. Saved on this device.
        </p>
      </Card>

      <Card className="mt-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-ink-muted">Display currency</p>
        <div className="grid grid-cols-3 gap-2">
          {(['USD', 'INR', 'CAD'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setDisplayCurrency(c)}
              className={`min-h-[44px] rounded-xl border text-sm ${
                displayCurrency === c
                  ? 'border-accent bg-accent/10 text-accent-bright'
                  : 'border-line/10 text-ink-secondary'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </Card>

      <Card className="mt-4">
        <p className="text-xs uppercase tracking-wide text-ink-muted">Install on Android</p>
        <div className="mt-3">
          <InstallPrompt variant="button" />
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          If the install button is unavailable, add the app manually:
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-ink-secondary">
          <li>Open this site in Chrome on Android.</li>
          <li>Tap the menu (⋮) → Add to Home screen / Install app.</li>
          <li>Orbitfolio opens standalone at /dashboard.</li>
        </ol>
      </Card>

      <Card className="mt-4 text-sm text-ink-secondary">
        <p className="text-xs uppercase tracking-wide text-ink-muted">100% free tier</p>
        <p className="mt-2">
          Yahoo public APIs, optional Groq for a 2-sentence rationale. Quotes cache 15 minutes; analysis 6 hours,
          shared per symbol. Upstash Redis is used when configured; otherwise in-memory plus local JSON under
          data/cache/market/. Built so a free-tier host can serve about 5,000 daily users on popular tickers.
        </p>
      </Card>

      <Card className="mt-4 text-xs leading-relaxed text-ink-faint">
        Public analysis may show an Orbit score, Buy/Hold/Sell, a short rationale, and street
        consensus. That is research guidance, not personalized or regulated investment advice.
        Holdings stay in localStorage on this device. Scoring weights live in the README, not on
        the analysis screen.
      </Card>
    </AppShell>
  );
}
