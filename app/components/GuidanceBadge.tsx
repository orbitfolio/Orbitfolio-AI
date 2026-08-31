import { actionColor, labelColor } from '@/lib/format';
import { actionFromScore } from '@/lib/market/rating';

export default function GuidanceBadge({
  label,
  score,
  action,
}: {
  label?: string | null;
  score?: number | null;
  action?: 'Buy' | 'Hold' | 'Sell' | null;
}) {
  const resolved =
    action ??
    (score != null && Number.isFinite(score) ? actionFromScore(score) : undefined);

  if (!label && !resolved) {
    return (
      <span role="status" className="inline-flex flex-col items-end gap-0.5">
        <span className="text-[9px] uppercase tracking-[0.14em] text-slate-500">Action</span>
        <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-400">
          Unrated
        </span>
      </span>
    );
  }

  return (
    <span role="status" className="inline-flex flex-col items-end gap-0.5">
      <span className="text-[9px] uppercase tracking-[0.14em] text-slate-500">Action</span>
      {resolved ? (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-sm font-semibold tabular-nums ${actionColor(resolved)}`}
        >
          <span>{resolved}</span>
          {score != null && <span className="text-xs font-medium opacity-80">{score.toFixed(1)}</span>}
        </span>
      ) : null}
      {label ? (
        <span
          className={`inline-flex items-center rounded border px-1.5 py-px text-[10px] font-medium ${labelColor(label)}`}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
