'use client';

/**
 * NewsFeed (Phase 7, gated feature): recent headlines beside an analysis.
 *
 * STRICTLY CONTEXT: this panel never receives or influences the Orbit
 * score. It is labeled at the panel, item, and data level ("Context only —
 * headlines never feed the Orbit score") so no reader can mistake it for
 * an input. Empty state renders nothing at all.
 */
import { useEffect, useState } from 'react';
import { cardClass } from './Card';

interface NewsItem {
  title: string;
  link: string;
  publisher: string;
  publishedAt: number | null;
}

function ageLabel(publishedAt: number | null): string {
  if (publishedAt == null || !Number.isFinite(publishedAt)) return '';
  const hours = Math.max(0, Date.now() - publishedAt) / 3_600_000;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m ago`;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function NewsFeed({ symbol }: { symbol: string }) {
  const [items, setItems] = useState<NewsItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/news?symbol=${encodeURIComponent(symbol)}`);
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { success: boolean; data?: { news?: NewsItem[] } };
        if (!cancelled) setItems(json.success ? (json.data?.news ?? []) : []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // No headlines (or endpoint down): render nothing — no skeleton noise.
  if (items != null && items.length === 0) return null;

  return (
    <section className={cardClass('md', 'mt-4')} aria-label="Recent news (context only)">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Recent news
        </p>
        <span className="rounded-full border border-line/10 bg-line/[0.04] px-2 py-0.5 text-[10px] font-medium text-ink-muted">
          Context only · not part of your score
        </span>
      </div>

      {items == null ? (
        <div className="mt-3 space-y-2">
          <div className="h-4 w-4/5 animate-pulse rounded bg-line/10" />
          <div className="h-4 w-3/5 animate-pulse rounded bg-line/10" />
        </div>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-line/[0.06]">
            {items.map((n) => (
              <li key={n.link} className="py-2 first:pt-0 last:pb-0">
                <a
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm leading-snug text-ink no-underline hover:text-accent-bright"
                >
                  {n.title}
                </a>
                <p className="mt-0.5 text-[11px] text-ink-faint">
                  {n.publisher}
                  {ageLabel(n.publishedAt) ? ` · ${ageLabel(n.publishedAt)}` : ''}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-line/[0.06] pt-2 text-[10px] leading-snug text-ink-faint">
            Third-party headlines for context. Headlines never feed the Orbit score — the rating comes
            only from the deterministic technicals, fundamentals, and analyst pillars above.
          </p>
        </>
      )}
    </section>
  );
}
