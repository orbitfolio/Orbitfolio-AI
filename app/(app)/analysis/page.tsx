'use client';

import Link from 'next/link';
import AppShell from '@/app/components/AppShell';
import GuidanceBadge from '@/app/components/GuidanceBadge';
import { useHoldingsStore } from '@/lib/store/holdings';

export default function AnalysisIndexPage() {
  const holdings = useHoldingsStore((s) => s.holdings);
  const analyses = useHoldingsStore((s) => s.analyses);
  const loadingAnalysis = useHoldingsStore((s) => s.loadingAnalysis);
  const rateAll = useHoldingsStore((s) => s.rateAll);

  return (
    <AppShell
      title="Analysis"
      action={
        <button
          type="button"
          onClick={() => void rateAll()}
          className="min-h-[40px] rounded-full border border-teal-400/30 bg-teal-400/10 px-3 text-xs font-semibold text-teal-300"
        >
          {loadingAnalysis ? 'Rating…' : 'Rate all'}
        </button>
      }
    >
      <p className="mb-4 text-sm text-slate-400">
        Public analysis shows score, Buy/Hold/Sell, a short rationale, and street consensus.
        Research labels stay descriptive. This is research guidance, not personalized regulated advice.
      </p>
      {holdings.length === 0 ? (
        <section className="rounded-2xl border border-white/[0.08] bg-[#101827] p-6 text-center">
          <p className="text-sm text-slate-300">No holdings yet.</p>
          <p className="mt-1 text-xs text-slate-500">Add a ticker to start scoring. Empty lists are not an error.</p>
          <Link
            href="/holdings"
            className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-teal-400 px-4 text-sm font-semibold text-[#07201c] no-underline"
          >
            Add holdings
          </Link>
        </section>
      ) : (
      <ul className="space-y-2">
        {holdings.map((h) => {
          const g = analyses[h.symbol]?.analysis.guidance;
          return (
            <li key={h.id}>
              <Link
                href={`/analysis/${encodeURIComponent(h.symbol)}`}
                className="flex min-h-[64px] items-center justify-between rounded-2xl border border-white/[0.08] bg-[#101827] px-3 py-3 no-underline"
              >
                <div>
                  <p className="font-semibold tabular-nums text-white">{h.symbol}</p>
                  <p className="text-xs text-slate-400">{h.name}</p>
                </div>
                <GuidanceBadge label={g?.label} score={g?.orbitScore} action={g?.action} />
              </Link>
            </li>
          );
        })}
      </ul>
      )}
    </AppShell>
  );
}
