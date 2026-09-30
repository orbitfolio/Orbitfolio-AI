/**
 * ScoreBreakdown (Part B8): renders the reasoning behind an Orbit score.
 *
 * Read-only display of values the engine already computed — this component
 * never changes a score. Shows the 35/35/30 pillar split (with the capped
 * beta adjustment labeled honestly), the technical component detail, and the
 * cash-quality / dividend measures from A1/A3.
 */
import { cardClass } from './Card';

export interface ScoreBreakdownProps {
  pillars: { technical: number; fundamental: number; analystConsensus: number };
  weights?: { technical: number; fundamental: number; analystConsensus: number } | null;
  analystAvailable?: boolean;
  riskAdjustment?: number | null;
  technical?: {
    relMomentum?: number | null;
    realizedVol?: number | null;
    maxDrawdown?: number | null;
    week52Range?: number | null;
    week52HighRatio?: number | null;
    mom12_1?: number | null;
    rsi14?: number | null;
    volumeRatio?: number | null;
    adx14?: number | null;
  } | null;
  fundamentals?: {
    cashConversion?: number | null;
    fcfConversion?: number | null;
    accrualsCheck?: number | null;
    dividendSustainability?: number | null;
    trailingPE?: number | null;
  } | null;
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="min-w-0 text-xs text-ink-muted">
        {label}
        {hint ? <span className="ml-1 text-[10px] text-ink-faint">{hint}</span> : null}
      </span>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-ink">{value}</span>
    </div>
  );
}

function pct(v: number | null | undefined, digits = 0): string {
  return v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(digits)}%`;
}

function num(v: number | null | undefined, digits = 2): string {
  return v == null || !Number.isFinite(v) ? '—' : v.toFixed(digits);
}

function signed(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}`;
}

export default function ScoreBreakdown({
  pillars,
  weights,
  analystAvailable = true,
  riskAdjustment,
  technical,
  fundamentals,
}: ScoreBreakdownProps) {
  const w = weights ?? { technical: 0.35, fundamental: 0.35, analystConsensus: 0.3 };
  const hasRelMom = technical?.relMomentum != null;

  return (
    <section className={cardClass('md', 'mt-4')} aria-label="Score breakdown">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Why this score
      </p>

      {/* Pillars — the 35/35/30 split */}
      <div className="mt-3 space-y-2">
        {(
          [
            { key: 'Technicals', value: pillars.technical, weight: w.technical, color: 'bg-accent-bright' },
            { key: 'Fundamentals', value: pillars.fundamental, weight: w.fundamental, color: 'bg-positive' },
            {
              key: 'Analyst consensus',
              value: analystAvailable ? pillars.analystConsensus : null,
              weight: analystAvailable ? w.analystConsensus : 0,
              color: 'bg-warning',
            },
          ] as const
        ).map((p) => (
          <div key={p.key}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-ink-secondary">{p.key}</span>
              <span className="tabular-nums text-ink-muted">
                {p.value != null ? `${p.value.toFixed(1)} · ${Math.round(p.weight * 100)}%` : 'N/A · weight redistributed'}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line/5">
              <div
                className={`h-full rounded-full ${p.color}`}
                style={{ width: `${p.value != null ? (p.value / 10) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Capped beta adjustment, labeled honestly */}
      {riskAdjustment != null && (
        <p className="mt-3 rounded-lg border border-line/10 bg-line/[0.04] px-2.5 py-2 text-[11px] leading-snug text-ink-muted">
          Beta risk adjustment:{' '}
          <span className="font-semibold tabular-nums text-ink">{signed(riskAdjustment, 1)}</span> applied to the
          technical score — capped at ±1.25 so it can never dominate momentum.
        </p>
      )}

      {/* Technical detail */}
      {technical && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-semibold text-accent-bright">
            Technical detail
          </summary>
          <div className="mt-1 divide-y divide-line/[0.06]">
            <Row label="12-1 momentum" value={pct(technical.mom12_1, 1)} />
            <Row
              label={hasRelMom ? 'Momentum vs market' : 'Momentum vs market'}
              value={hasRelMom ? signed(technical.relMomentum!, 0) : 'n/a'}
              hint={hasRelMom ? undefined : '(benchmark unavailable)'}
            />
            <Row label="Realized volatility (1y)" value={pct(technical.realizedVol, 0)} />
            <Row label="Max drawdown (1y)" value={pct(technical.maxDrawdown, 0)} />
            <Row label="52-week range position" value={pct(technical.week52Range, 0)} />
            <Row label="Distance from 52w high" value={pct(technical.week52HighRatio ? technical.week52HighRatio - 1 : null, 1)} />
            <Row label="RSI (14)" value={num(technical.rsi14, 1)} hint={technical.adx14 != null ? `ADX ${num(technical.adx14, 0)}` : undefined} />
            <Row label="Relative volume" value={technical.volumeRatio != null ? `${num(technical.volumeRatio, 2)}×` : '—'} />
          </div>
        </details>
      )}

      {/* Cash quality + dividends (A1/A3) */}
      {fundamentals && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-semibold text-accent-bright">
            Cash quality &amp; dividends
          </summary>
          <div className="mt-1 divide-y divide-line/[0.06]">
            <Row
              label="Cash conversion (OCF / net income)"
              value={fundamentals.cashConversion != null ? `${num(fundamentals.cashConversion, 2)}×` : 'n/a'}
              hint={fundamentals.cashConversion == null ? '(loss-maker: accruals used)' : undefined}
            />
            <Row label="FCF conversion (FCF / OCF)" value={fundamentals.fcfConversion != null ? `${num(fundamentals.fcfConversion, 2)}×` : 'n/a'} />
            <Row label="Accruals" value={num(fundamentals.accrualsCheck, 2)} hint="≤ 0 is conservative" />
            <Row
              label="Dividend payout ratio"
              value={fundamentals.dividendSustainability != null ? pct(fundamentals.dividendSustainability, 0) : 'no dividend data'}
            />
            <Row label="Trailing P/E" value={fundamentals.trailingPE != null ? num(fundamentals.trailingPE, 1) : '—'} />
          </div>
        </details>
      )}

      <p className="mt-3 border-t border-line/[0.06] pt-2 text-[10px] leading-snug text-ink-faint">
        Fixed 35/35/30 weights (redistributed when data is missing). Every number above is computed by
        deterministic rules — the same inputs always produce the same score.
      </p>
    </section>
  );
}
