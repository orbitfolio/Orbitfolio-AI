'use client';

import Link from 'next/link';
import AppShell from '@/app/components/AppShell';
import GuidanceBadge from '@/app/components/GuidanceBadge';
import Card, { cardClass } from '@/app/components/Card';
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
          className="min-h-[40px] rounded-full border border-accent/30 bg-accent/10 px-3 text-xs font-semibold text-accent-bright"
        >
          {loadingAnalysis ? 'Rating…' : 'Rate all'}
        </button>
      }
    >
      <p className="mb-4 text-sm text-ink-muted">
        Public analysis shows score, Buy/Hold/Sell, a short rationale, and street consensus.
        Research labels stay descriptive. This is research guidance, not personalized regulated advice.
      </p>
      {holdings.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="text-sm text-ink-secondary">No holdings yet.</p>
          <p className="mt-1 text-xs text-ink-faint">Add a ticker to start scoring. Empty lists are not an error.</p>
          <Link
            href="/holdings"
            className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink no-underline"
          >
            Add holdings
          </Link>
        </Card>
      ) : (
      <ul className="space-y-2">
        {holdings.map((h) => {
          const g = analyses[h.symbol]?.analysis.guidance;
          return (
            <li key={h.id}>
              <Link
                href={`/analysis/${encodeURIComponent(h.symbol)}`}
                className={cardClass('sm', 'flex min-h-[64px] items-center justify-between px-3 py-3 no-underline')}
              >
                <div>
                  <p className="font-semibold tabular-nums text-ink">{h.symbol}</p>
                  <p className="text-xs text-ink-muted">{h.name}</p>
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
