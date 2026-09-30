'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppShell from '@/app/components/AppShell';
import GuidanceBadge from '@/app/components/GuidanceBadge';
import InstallPrompt from '@/app/components/InstallPrompt';
import Card from '@/app/components/Card';
import { formatMoney, formatPct, healthColor } from '@/lib/format';
import { convertTo, useHoldingsStore } from '@/lib/store/holdings';

export default function DashboardPage() {
  const holdings = useHoldingsStore((s) => s.holdings);
  const quotes = useHoldingsStore((s) => s.quotes);
  const analyses = useHoldingsStore((s) => s.analyses);
  const fx = useHoldingsStore((s) => s.fx);
  const displayCurrency = useHoldingsStore((s) => s.displayCurrency);
  const healthRating = useHoldingsStore((s) => s.healthRating);
  const loadingQuotes = useHoldingsStore((s) => s.loadingQuotes);
  const loadingAnalysis = useHoldingsStore((s) => s.loadingAnalysis);
  const ratingDone = useHoldingsStore((s) => s.ratingDone);
  const ratingTotal = useHoldingsStore((s) => s.ratingTotal);
  const refreshQuotes = useHoldingsStore((s) => s.refreshQuotes);
  const rateAll = useHoldingsStore((s) => s.rateAll);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshQuotes();
      if (!cancelled) await rateAll();
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshQuotes, rateAll]);

  const stats = useMemo(() => {
    let value = 0;
    let cost = 0;
    let day = 0;
    const byMarket: Record<string, number> = { US: 0, IN: 0, CA: 0 };
    for (const h of holdings) {
      const q = quotes[h.symbol];
      const px = q?.price ?? h.averagePrice;
      const prev = q?.previousClose ?? px;
      const mv = convertTo(px * h.quantity, h.currency, displayCurrency, fx);
      const cs = convertTo(h.averagePrice * h.quantity, h.currency, displayCurrency, fx);
      const dv = convertTo((px - prev) * h.quantity, h.currency, displayCurrency, fx);
      value += mv;
      cost += cs;
      day += dv;
      byMarket[h.market] = (byMarket[h.market] || 0) + mv;
    }
    const pnl = value - cost;
    const pnlPct = cost ? (pnl / cost) * 100 : 0;
    const dayPct = value - day ? (day / (value - day)) * 100 : 0;
    return { value, cost, pnl, pnlPct, day, dayPct, byMarket };
  }, [holdings, quotes, fx, displayCurrency]);

  const avgScore = useMemo(() => {
    const scores = holdings
      .map((h) => analyses[h.symbol]?.analysis.orbitScore)
      .filter((n): n is number => typeof n === 'number');
    if (!scores.length) return null;
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  }, [holdings, analyses]);

  const quotesReady = Object.keys(quotes).length > 0;
  const progressLabel =
    loadingAnalysis && ratingTotal > 0
      ? `Rating ${ratingDone}/${ratingTotal} holdings…`
      : loadingAnalysis
        ? 'Rating holdings…'
        : 'Rate all';

  return (
    <AppShell
      title="Dashboard"
      action={
        <button
          type="button"
          onClick={() => void rateAll()}
          className="min-h-[40px] rounded-full border border-accent-bright/30 bg-accent-bright/10 px-3 text-xs font-semibold text-accent-bright"
        >
          {loadingAnalysis ? progressLabel.replace(' holdings…', '…') : 'Rate all'}
        </button>
      }
    >
      <InstallPrompt variant="banner" />

      {holdings.length === 0 && (
        <Card className="mb-4 text-center">
          <p className="text-sm text-ink-secondary">No holdings yet.</p>
          <Link
            href="/holdings"
            className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink no-underline"
          >
            Add holdings
          </Link>
        </Card>
      )}

      <Card>
        <p className="text-xs text-ink-muted">Portfolio value</p>
        {loadingQuotes && !quotesReady ? (
          <p className="mt-1 text-3xl font-semibold text-ink-faint">Loading quotes…</p>
        ) : (
          <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">
            {formatMoney(stats.value, displayCurrency)}
          </p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-ink-muted">Total P&amp;L</p>
            {loadingQuotes && !quotesReady ? (
              <p className="text-ink-faint">Loading quotes…</p>
            ) : (
              <p className={`tabular-nums ${stats.pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                {formatMoney(stats.pnl, displayCurrency)} ({formatPct(stats.pnlPct)})
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-ink-muted">Day change</p>
            {loadingQuotes && !quotesReady ? (
              <p className="text-ink-faint">Loading quotes…</p>
            ) : (
              <p className={`tabular-nums ${stats.day >= 0 ? 'text-positive' : 'text-negative'}`}>
                {formatMoney(stats.day, displayCurrency)} ({formatPct(stats.dayPct)})
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-line/[0.06] bg-line/[0.03] px-3 py-2">
          <div>
            <p className="text-xs text-ink-muted">Health rating</p>
            {avgScore == null ? (
              <p className="text-sm text-ink-muted">
                {loadingAnalysis ? progressLabel : 'Rate all to see scores'}
              </p>
            ) : (
              <p className={`text-lg font-semibold ${healthColor(healthRating || 'C')}`}>
                {healthRating || '—'}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-muted">Avg Orbit score</p>
            {avgScore == null ? (
              <p className="text-sm text-ink-muted">
                {loadingAnalysis ? progressLabel : 'Rate all to see scores'}
              </p>
            ) : (
              <p className="text-lg font-semibold tabular-nums text-ink">{avgScore}</p>
            )}
          </div>
        </div>
        {loadingAnalysis && ratingTotal > 0 && (
          <p className="mt-3 text-sm text-accent-bright">Rating {ratingDone}/{ratingTotal} holdings…</p>
        )}
      </Card>

      <Card className="mt-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-ink-muted">Allocation</p>
        <div className="flex h-2 overflow-hidden rounded-full bg-line/5">
          {(['US', 'IN', 'CA'] as const).map((m) => {
            const pct = stats.value ? (stats.byMarket[m] / stats.value) * 100 : 0;
            const colors = { US: 'bg-accent-bright', IN: 'bg-warning', CA: 'bg-sky-400' };
            return <div key={m} className={colors[m]} style={{ width: `${pct}%` }} />;
          })}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-ink-muted">
          {(['US', 'IN', 'CA'] as const).map((m) => (
            <span key={m}>
              {m} {stats.value ? ((stats.byMarket[m] / stats.value) * 100).toFixed(0) : 0}%
            </span>
          ))}
        </div>
      </Card>

      <section className="mt-4 space-y-2">
        <p className="text-xs uppercase tracking-wide text-ink-muted">Holdings</p>
        {holdings.map((h) => {
          const q = quotes[h.symbol];
          const g = analyses[h.symbol]?.analysis.guidance;
          const px = q?.price ?? h.averagePrice;
          const mv = convertTo(px * h.quantity, h.currency, displayCurrency, fx);
          return (
            <Link
              key={h.id}
              href={`/analysis/${encodeURIComponent(h.symbol)}`}
              className="flex min-h-[72px] items-center justify-between rounded-2xl border border-line/[0.08] bg-card px-3 py-3 no-underline"
            >
              <div className="min-w-0">
                <p className="font-semibold tabular-nums text-ink">{h.symbol}</p>
                <p className="truncate text-xs text-ink-muted">{h.name}</p>
              </div>
              <div className="ml-3 text-right">
                <p className="tabular-nums text-sm text-ink">{formatMoney(mv, displayCurrency)}</p>
                <div className="mt-1 flex justify-end">
                  <GuidanceBadge label={g?.label} score={g?.orbitScore} action={g?.action} />
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </AppShell>
  );
}
