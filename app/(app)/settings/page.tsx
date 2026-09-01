'use client';

import { useRef, useState } from 'react';
import AppShell from '@/app/components/AppShell';
import InstallPrompt from '@/app/components/InstallPrompt';
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

  return (
    <AppShell title="Settings">
      <section className="rounded-2xl border border-white/[0.08] bg-[#101827] p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">Mode</p>
        <p className="mt-1 text-sm text-white">Demo · localStorage · this device only</p>
        <p className="mt-1 text-xs text-slate-500">
          Holdings live in this browser on this device. No login required.
          {hasSupabase ? ' Connected accounts can use /api/holdings when a session exists.' : ''}
        </p>
      </section>

      <section className="mt-4 rounded-2xl border border-white/[0.08] bg-[#101827] p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Holdings JSON</p>
        <p className="text-xs text-slate-500">
          Export, replace, or clear the demo list stored on this device only. Importing replaces
          the current list.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={exportHoldings}
            className="min-h-[44px] rounded-xl border border-white/15 text-sm text-slate-200"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="min-h-[44px] rounded-xl border border-white/15 text-sm text-slate-200"
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
        {ioNote ? <p className="mt-3 text-xs text-teal-200">{ioNote}</p> : null}
      </section>

      <section className="mt-4 rounded-2xl border border-white/[0.08] bg-[#101827] p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Display currency</p>
        <div className="grid grid-cols-3 gap-2">
          {(['USD', 'INR', 'CAD'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setDisplayCurrency(c)}
              className={`min-h-[44px] rounded-xl border text-sm ${
                displayCurrency === c
                  ? 'border-teal-400 bg-teal-400/10 text-teal-200'
                  : 'border-white/10 text-slate-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-white/[0.08] bg-[#101827] p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">Install on Android</p>
        <div className="mt-3">
          <InstallPrompt variant="button" />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          If the install button is unavailable, add the app manually:
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-slate-300">
          <li>Open this site in Chrome on Android.</li>
          <li>Tap the menu (⋮) → Add to Home screen / Install app.</li>
          <li>Orbitfolio opens standalone at /dashboard.</li>
        </ol>
      </section>

      <section className="mt-4 rounded-2xl border border-white/[0.08] bg-[#101827] p-4 text-sm text-slate-300">
        <p className="text-xs uppercase tracking-wide text-slate-400">100% free tier</p>
        <p className="mt-2">
          Yahoo public APIs, optional Groq for a 2-sentence rationale. Quotes cache 15 minutes; analysis 6 hours,
          shared per symbol. Upstash Redis is used when configured; otherwise in-memory plus local JSON under
          data/cache/market/. Built so a free-tier host can serve about 5,000 daily users on popular tickers.
        </p>
      </section>

      <section className="mt-4 rounded-2xl border border-white/[0.08] bg-[#101827] p-4 text-xs leading-relaxed text-slate-500">
        Public analysis may show an Orbit score, Buy/Hold/Sell, a short rationale, and street
        consensus. That is research guidance, not personalized or regulated investment advice.
        Holdings stay in localStorage on this device. Scoring weights live in the README, not on
        the analysis screen.
      </section>
    </AppShell>
  );
}
