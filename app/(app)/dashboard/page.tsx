'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppShell from '@/app/components/AppShell';
import GuidanceBadge from '@/app/components/GuidanceBadge';
import InstallPrompt from '@/app/components/InstallPrompt';
import Card from '@/app/components/Card';
import { formatMoney, formatPct, formatQuoteAge, healthColor } from '@/lib/format';
import { convertTo, useHoldingsStore } from '@/lib/store/holdings';
import { useNow } from '@/lib/useNow';

/** Minutes after which a visible "as of …" label appears next to the hero value. */
const QUOTE_AGE_NOTICE_MS = 20 * 60 * 1000;

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
  const quotesFetchedAt = useHoldingsStore((s) => s.quotesFetchedAt);
  const quotesFailed = useHoldingsStore((s) => s.quotesFailed);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshQuotes();
      if (useHoldingsStore.getState().quotesFailed && !cancelled) {
        // One silent retry after a pause, then leave the failure visible
        // with a manual Retry instead of looping against a throttling API.
        await new Promise((r) => setTimeout(r, 4000));
        if (cancelled) return;
        await refreshQuotes({ force: true });
      }
      if (!cancelled) await rateAll();
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshQuotes, rateAll]);

  // Ticking clock keeps the quote-age label current while the page is open.
  const now = useNow(60_000);
  const quoteAge =
    quotesFetchedAt != null && now != null && !(loadingQuotes && !quotesFetchedAt)
      ? now - quotesFetchedAt
      : null;
  const showQuoteAge = quoteAge != null && quoteAge >= QUOTE_AGE_NOTICE_MS;
  const showDegraded =
    !loadingQuotes && quotesFailed && quotesFetchedAt == null;

  const stats = useMemo(() => {
    let value = 0;
    let cost = 0;
    let day = 0;
    const byMarket: Record<string, number> = {};
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

  /**
   * Allocation segments for any market, largest first. Token color cycle:
   * accent → warning → positive → card-looping neutrals. Deliberately no
   * red — a red slice would read as a loss, which allocation is not.
   */
  const allocationSegments = useMemo(() => {
    const cycle = ['bg-accent-bright', 'bg-warning', 'bg-positive', 'bg-ink-faint'];
    return Object.entries(stats.byMarket)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([market, v], i) => ({
        market,
        pct: stats.value ? (v / stats.value) * 100 : 0,
        color: cycle[i % cycle.length],
      }));
  }, [stats.byMarket, stats.value]);

  /** Holdings enriched for the table, largest position first. */
  const rows = useMemo(() => {
    return holdings
      .map((h) => {
        const q = quotes[h.symbol];
        const g = analyses[h.symbol]?.analysis.guidance;
        const px = q?.price ?? h.averagePrice;
        const prev = q?.previousClose ?? px;
        const mv = convertTo(px * h.quantity, h.currency, displayCurrency, fx);
        const dayChange = px != null && prev != null ? (px - prev) * h.quantity : null;
        const weight = stats.value ? (mv / stats.value) * 100 : 0;
        return {
          id: h.id,
          symbol: h.symbol,
          name: h.name,
          price: px,
          currency: q?.currency || h.currency,
          dayPct: px != null && prev ? ((px - prev) / prev) * 100 : null,
          dayAbs: dayChange != null ? convertTo(dayChange, h.currency, displayCurrency, fx) : null,
          mv,
          weight,
          guidance: g ?? null,
        };
      })
      .sort((a, b) => b.mv - a.mv);
  }, [holdings, quotes, analyses, fx, displayCurrency, stats.value]);

  const quotesReady = Object.keys(quotes).length > 0;
  const progressLabel =
    loadingAnalysis && ratingTotal > 0
      ? `Rating ${ratingDone}/${ratingTotal} holdings…`
      : loadingAnalysis
        ? 'Rating holdings…'
        : 'Rate all';

  const skeletonPill = 'inline-block h-4 w-16 animate-pulse rounded bg-line/10';

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

      {/* Hero: portfolio value — the number people open the app for */}
      <section className="py-2 text-center">
        <p className="text-xs uppercase tracking-wide text-ink-muted">Portfolio value</p>
        {showDegraded && (
          <div className="mx-auto mt-2 flex max-w-fit items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-[11px] text-ink-secondary">
            <span>Market data unavailable — showing your entries</span>
            <button
              type="button"
              onClick={() => void refreshQuotes({ force: true })}
              className="min-h-[28px] rounded-full border border-accent/30 bg-accent/10 px-2 text-[11px] font-semibold text-accent-bright"
            >
              Retry
            </button>
          </div>
        )}
        {!showDegraded && showQuoteAge && (
          <p className="mt-1 text-[11px] text-ink-faint">Prices as of {formatQuoteAge(quoteAge)}</p>
        )}
        {loadingQuotes && !quotesReady ? (
          <div className="mx-auto mt-2 h-10 w-56 animate-pulse rounded-xl bg-line/10" />
        ) : (
          <p className="mt-1 text-5xl font-semibold tabular-nums tracking-tight text-ink">
            {formatMoney(stats.value, displayCurrency)}
          </p>
        )}
        <p className="mt-2 text-sm tabular-nums">
          {loadingQuotes && !quotesReady ? (
            <span className={skeletonPill} />
          ) : (
            <span className={stats.pnl >= 0 ? 'text-positive' : 'text-negative'}>
              {formatMoney(stats.pnl, displayCurrency)} ({formatPct(stats.pnlPct)}) all time
            </span>
          )}
          <span className="mx-2 text-ink-faint">·</span>
          {loadingQuotes && !quotesReady ? (
            <span className={skeletonPill} />
          ) : (
            <span className={stats.day >= 0 ? 'text-positive' : 'text-negative'}>
              {formatMoney(stats.day, displayCurrency)} ({formatPct(stats.dayPct)}) today
            </span>
          )}
        </p>
      </section>

      {/* Stat tiles */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Card padding="sm" className="text-center">
          <p className="text-[10px] uppercase tracking-wide text-ink-muted">Health</p>
          {avgScore == null ? (
            <p className="mt-1 text-sm text-ink-faint">{loadingAnalysis ? '…' : '—'}</p>
          ) : (
            <p className={`mt-1 text-xl font-bold leading-none ${healthColor(healthRating || 'C')}`}>
              {healthRating || '—'}
            </p>
          )}
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-[10px] uppercase tracking-wide text-ink-muted">Avg score</p>
          {avgScore == null ? (
            <p className="mt-1 text-sm text-ink-faint">{loadingAnalysis ? '…' : '—'}</p>
          ) : (
            <p className="mt-1 text-xl font-bold leading-none tabular-nums text-ink">
              {avgScore.toFixed(1)}
            </p>
          )}
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-[10px] uppercase tracking-wide text-ink-muted">Holdings</p>
          <p className="mt-1 text-xl font-bold leading-none tabular-nums text-ink">{holdings.length}</p>
        </Card>
      </div>

      {loadingAnalysis && ratingTotal > 0 && (
        <p className="mt-3 text-center text-sm text-accent-bright">
          Rating {ratingDone}/{ratingTotal} holdings…
        </p>
      )}

      <Card className="mt-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-ink-muted">Allocation</p>
        <div className="flex h-2 overflow-hidden rounded-full bg-line/5">
          {allocationSegments.map((s) => (
            <div key={s.market} className={s.color} style={{ width: `${s.pct}%` }} />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-muted">
          {allocationSegments.map((s) => (
            <span key={s.market} className="inline-flex items-center gap-1">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.color}`} />
              {s.market} {s.pct.toFixed(0)}%
            </span>
          ))}
        </div>
      </Card>

      {/* Holdings — table on desktop, cards on mobile */}
      <section className="mt-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-ink-muted">Holdings</p>

        {holdings.length === 0 ? null : (
          <>
            {/* Desktop table */}
            <Card padding="none" className="hidden overflow-hidden lg:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line/[0.08] text-[10px] uppercase tracking-wide text-ink-muted">
                    <th className="px-4 py-2.5 font-medium">Symbol</th>
                    <th className="px-2 py-2.5 text-right font-medium">Price</th>
                    <th className="px-2 py-2.5 text-right font-medium">Day</th>
                    <th className="px-2 py-2.5 text-right font-medium">Value</th>
                    <th className="px-2 py-2.5 text-right font-medium">Weight</th>
                    <th className="px-4 py-2.5 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-line/[0.05] transition-colors last:border-0 hover:bg-line/[0.03]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/analysis/${encodeURIComponent(r.symbol)}`}
                          className="block no-underline"
                        >
                          <span className="block font-semibold tabular-nums text-ink">{r.symbol}</span>
                          <span className="block max-w-[180px] truncate text-xs text-ink-muted">{r.name}</span>
                        </Link>
                      </td>
                      <td className="px-2 py-3 text-right tabular-nums text-ink-secondary">
                        {r.price != null ? formatMoney(r.price, r.currency) : '—'}
                      </td>
                      <td
                        className={`px-2 py-3 text-right tabular-nums ${
                          r.dayPct == null ? 'text-ink-faint' : r.dayPct >= 0 ? 'text-positive' : 'text-negative'
                        }`}
                      >
                        {r.dayPct != null ? formatPct(r.dayPct, 1) : '—'}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold tabular-nums text-ink">
                        {formatMoney(r.mv, displayCurrency)}
                      </td>
                      <td className="px-2 py-3 text-right tabular-nums text-ink-secondary">
                        {r.weight.toFixed(0)}%
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <GuidanceBadge
                            label={r.guidance?.label}
                            score={r.guidance?.orbitScore}
                            action={r.guidance?.action}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Mobile cards */}
            <div className="space-y-2 lg:hidden">
              {rows.map((r) => (
                <Link
                  key={r.id}
                  href={`/analysis/${encodeURIComponent(r.symbol)}`}
                  className="flex min-h-[72px] items-center justify-between rounded-2xl border border-line/[0.08] bg-card px-3 py-3 no-underline"
                >
                  <div className="min-w-0">
                    <p className="font-semibold tabular-nums text-ink">{r.symbol}</p>
                    <p className="truncate text-xs text-ink-muted">{r.name}</p>
                    <p
                      className={`mt-0.5 text-xs tabular-nums ${
                        r.dayPct == null ? 'text-ink-faint' : r.dayPct >= 0 ? 'text-positive' : 'text-negative'
                      }`}
                    >
                      {r.dayPct != null ? formatPct(r.dayPct, 1) : '—'} · {formatMoney(r.price ?? 0, r.currency)}
                    </p>
                  </div>
                  <div className="ml-3 text-right">
                    <p className="tabular-nums text-sm font-semibold text-ink">
                      {formatMoney(r.mv, displayCurrency)}
                    </p>
                    <p className="text-[11px] tabular-nums text-ink-faint">{r.weight.toFixed(0)}% of book</p>
                    <div className="mt-1 flex justify-end">
                      <GuidanceBadge label={r.guidance?.label} score={r.guidance?.orbitScore} action={r.guidance?.action} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
