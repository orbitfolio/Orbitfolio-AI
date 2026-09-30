/**
 * News headlines (Phase 7, the plan's gated feature).
 *
 * STRICTLY NON-SCORING: nothing in this module feeds lib/market/rating.ts,
 * combineRating, or any pillar. It exists only to display recent headlines
 * next to an analysis, clearly labeled as context — never as an input.
 * The score stays purely deterministic from technicals, fundamentals, and
 * analyst consensus.
 *
 * Data: Yahoo RSS search (no key), parsed with a regex — no new dependency.
 * Server-side only, cached 30 minutes like the quote window.
 */

import { cacheGet, cacheSet, quoteBucket } from './cache';

export interface NewsItem {
  title: string;
  link: string;
  publisher: string;
  /** Epoch ms when the item was published, if the feed provided it. */
  publishedAt: number | null;
}

const NEWS_TTL_SECONDS = 30 * 60;

/** Accept only http(s) links — the RSS field is externally controlled. */
function safeLink(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

function tag(block: string, name: string): string | null {
  const open = `<${name}`;
  const start = block.indexOf(open);
  if (start === -1) return null;
  // Guard against prefix matches (e.g. <titlex>) — next char must open/close the tag.
  const after = block[start + open.length];
  if (after !== '>' && after !== ' ' && after !== '/') return null;
  const gt = block.indexOf('>', start);
  if (gt === -1) return null;
  const close = `</${name}>`;
  const end = block.indexOf(close, gt);
  if (end === -1) return null;
  return decodeEntities(block.slice(gt + 1, end));
}

export function parseYahooRss(xml: string, limit = 6): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks) {
    const title = tag(block, 'title');
    const rawLink = tag(block, 'link');
    if (!title || !rawLink) continue;
    const link = safeLink(rawLink);
    if (!link) continue;
    const pub = tag(block, 'pubDate');
    const publishedAt = pub ? Date.parse(pub) : NaN;
    items.push({
      title,
      link,
      publisher: tag(block, 'source') ?? 'Yahoo Finance',
      publishedAt: Number.isFinite(publishedAt) ? publishedAt : null,
    });
    if (items.length >= limit) break;
  }
  return items;
}

export function newsCacheKey(symbol: string): string {
  return `news:${symbol}:${quoteBucket()}`;
}

/** Cached fetch: 15-minute bucketed key + 30-minute TTL. Never throws. */
export async function fetchNewsForSymbol(symbol: string, limit = 6): Promise<NewsItem[]> {
  const key = newsCacheKey(symbol);
  const cached = await cacheGet<NewsItem[]>(key);
  if (cached) return cached;
  const url =
    `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}` +
    `&region=US&lang=en-US`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; Orbitfolio/1.0)' },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const items = parseYahooRss(await res.text(), limit);
    if (items.length) await cacheSet(key, items, NEWS_TTL_SECONDS);
    return items;
  } catch {
    return [];
  }
}

export { NEWS_TTL_SECONDS };
