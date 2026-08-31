'use client';

import AppShell from '@/app/components/AppShell';
import InstallPrompt from '@/app/components/InstallPrompt';
import { useHoldingsStore } from '@/lib/store/holdings';

const hasSupabase =
  typeof process !== 'undefined' && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export default function SettingsPage() {
  const displayCurrency = useHoldingsStore((s) => s.displayCurrency);
  const setDisplayCurrency = useHoldingsStore((s) => s.setDisplayCurrency);

  return (
    <AppShell title="Settings">
      <section className="rounded-2xl border border-white/[0.08] bg-[#101827] p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">Mode</p>
        <p className="mt-1 text-sm text-white">Demo · localStorage</p>
        <p className="mt-1 text-xs text-slate-500">
          Holdings live on this device. No login required.
          {hasSupabase ? ' Connected accounts can use /api/holdings when a session exists.' : ''}
        </p>
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
        Orbitfolio provides analytical tools for informational purposes only. This is not investment advice. Guidance
        labels are not buy, sell, hold, trim, or accumulate recommendations. Consult a qualified advisor.
      </section>
    </AppShell>
  );
}
