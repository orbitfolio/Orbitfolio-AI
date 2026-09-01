'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/app/components/AppShell';
import GuidanceBadge from '@/app/components/GuidanceBadge';
import { formatMoney } from '@/lib/format';
import { actionFromScore } from '@/lib/market/rating';
import { useHoldingsStore, type AnalysisView } from '@/lib/store/holdings';

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] px-3 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="tabular-nums text-sm text-white">{value}</p>
    </div>
  );
}

function prettyStreetKey(key?: string | null): string {
  if (!key) return '—';
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const BUSY_COPY = 'Market data is temporarily busy. Showing last saved score when available.';

function AnalysisSymbolBody({ symbol }: { symbol: string }) {
  const cached = useHoldingsStore((s) => s.analyses[symbol]);
  const rateSymbol = useHoldingsStore((s) => s.rateSymbol);
  const [fetched, setFetched] = useState<AnalysisView | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [tick, setTick] = useState(0);

  const view = fetched ?? cached ?? null;
  const loading = !view && !empty;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await rateSymbol(symbol);
      if (cancelled) return;
      if (result) {
        setFetched(result);
        setEmpty(false);
        if (result.meta?.source === 'offline') setNote('Offline sample · reconnecting to live market data');
        else if (result.meta?.stale) setNote('Using cached research while market data reconnects');
        else setNote(null);
      } else {
        const kept = useHoldingsStore.getState().analyses[symbol];
        if (kept) {
          setFetched(kept);
          setNote('Using saved score');
        } else {
          setEmpty(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [symbol, rateSymbol, tick]);

  const g = view?.analysis.guidance;
  const q = view?.quote;
  const action = g ? (g.action ?? actionFromScore(g.orbitScore)) : undefined;
  const street = g?.analystRaw;
  const streetAvailable = g?.analystAvailable !== false && Boolean(street?.recommendationKey || street?.numberOfAnalysts || street?.targetMean);

  return (
    <AppShell title={symbol}>
      {loading && !view && <p className="text-sm text-slate-400">Scoring {symbol}...</p>}
      {note && view && <p className="mb-3 text-xs text-slate-400">{note}</p>}
      {empty && !view && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-sm text-slate-300">{BUSY_COPY}</p>
          <button
            type="button"
            onClick={() => {
              setEmpty(false);
              setTick((n) => n + 1);
            }}
            className="mt-3 min-h-[40px] rounded-full border border-teal-400/30 bg-teal-400/10 px-4 text-xs font-semibold text-teal-300"
          >
            Retry
          </button>
        </div>
      )}
      {g && (
        <>
          <section className="rounded-2xl border border-white/[0.08] bg-[#101827] p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-400">{q?.name || symbol}</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-white">
                  {g.orbitScore.toFixed(1)}
                  <span className="text-base text-slate-500"> / 10</span>
                </p>
              </div>
              <GuidanceBadge label={g.label} score={g.orbitScore} action={action} />
            </div>
            {q?.price != null && (
              <p className="mt-2 text-sm tabular-nums text-slate-300">
                {formatMoney(q.price, q.currency)}
              </p>
            )}
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{g.rationale}</p>
          </section>

          <section className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
              Street consensus
            </p>
            {streetAvailable ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Metric label="Street view" value={prettyStreetKey(street?.recommendationKey)} />
                <Metric
                  label="Analysts"
                  value={street?.numberOfAnalysts != null ? String(street.numberOfAnalysts) : '—'}
                />
                <Metric
                  label="Target"
                  value={
                    street?.targetMean != null
                      ? formatMoney(street.targetMean, q?.currency || 'USD')
                      : '—'
                  }
                />
              </div>
            ) : (
              <p className="mt-2 text-sm text-amber-100/80">
                No published street consensus for this listing.
              </p>
            )}
          </section>

          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            Client action (Buy / Hold / Sell) is research guidance. This is not personalized
            regulated advice. Past data is delayed and may be incomplete.
          </p>
        </>
      )}
    </AppShell>
  );
}

export default function AnalysisSymbolPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = decodeURIComponent(params.symbol || '').toUpperCase();
  return <AnalysisSymbolBody key={symbol} symbol={symbol} />;
}
