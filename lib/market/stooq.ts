/**
 * Stooq daily CSV fallback (free, no key).
 * Skip when the host returns a JS challenge / HTML page instead of CSV.
 */

import https from 'node:https';
import type { IncomingHttpHeaders } from 'node:http';
import type { OhlcvBar } from './technicals';
import type { ChartResult, YahooQuote } from './yahoo';

const USER_AGENT =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

const TIMEOUT_MS = 8000;
const HOSTS = ['https://stooq.com', 'https://stooq.pl'] as const;

/** Explicit Orbitfolio → Stooq ticker probes (lowercase). */
export const STOOQ_EXPLICIT: Record<string, string[]> = {
    AAPL: ['aapl.us'],
    MSFT: ['msft.us'],
    NVDA: ['nvda.us'],
    'RELIANCE.NS': ['reliance.in', 'rel.in', 'reliance.ns'],
    'INFY.NS': ['infy.in'],
    'SHOP.TO': ['shop.ca'],
};

export function isFxSymbol(symbol: string): boolean {
    const s = symbol.trim().toUpperCase();
    return s.endsWith('=X') || s.includes('=');
}

/**
 * Map an Orbitfolio/Yahoo symbol to Stooq tickers to probe, in order.
 * FX pairs are skipped (empty). Generic: XXX → xxx.us, .NS/.BO → .in, .TO/.V → .ca.
 */
export function stooqCandidates(symbol: string): string[] {
    const sym = symbol.trim().toUpperCase();
    if (!sym || isFxSymbol(sym)) return [];
    if (STOOQ_EXPLICIT[sym]) return [...STOOQ_EXPLICIT[sym]];

    if (sym.endsWith('.NS') || sym.endsWith('.BO')) {
        return [`${sym.slice(0, -3).toLowerCase()}.in`];
    }
    if (sym.endsWith('.TO')) {
        return [`${sym.slice(0, -3).toLowerCase()}.ca`];
    }
    if (sym.endsWith('.V')) {
        return [`${sym.slice(0, -2).toLowerCase()}.ca`];
    }
    if (sym.includes('.')) {
        const [base] = sym.split('.');
        return [`${base.toLowerCase()}.us`];
    }
    return [`${sym.toLowerCase()}.us`];
}

export function toStooqSymbol(symbol: string): string | null {
    return stooqCandidates(symbol)[0] ?? null;
}

export function isStooqChallenge(body: string): boolean {
    const head = body.trimStart().slice(0, 400).toLowerCase();
    if (!head) return false;
    if (head.startsWith('<!doctype') || head.startsWith('<html')) return true;
    if (head.includes('<script') && (head.includes('challenge') || head.includes('cf-') || head.includes('captcha'))) {
        return true;
    }
    return false;
}

export function looksLikeStooqCsv(body: string): boolean {
    const first = body.trimStart().split(/\r?\n/, 1)[0] ?? '';
    return /date/i.test(first) && /close/i.test(first);
}

export function parseStooqCsv(csv: string): OhlcvBar[] {
    const lines = csv.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const idx = {
        date: header.findIndex((h) => h === 'date'),
        open: header.findIndex((h) => h === 'open'),
        high: header.findIndex((h) => h === 'high'),
        low: header.findIndex((h) => h === 'low'),
        close: header.findIndex((h) => h === 'close'),
        volume: header.findIndex((h) => h === 'volume'),
    };
    if (idx.date < 0 || idx.close < 0) return [];

    const bars: OhlcvBar[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        const close = Number(cols[idx.close]);
        if (!Number.isFinite(close)) continue;
        const dateStr = cols[idx.date];
        const time = Date.parse(dateStr);
        if (!Number.isFinite(time)) continue;
        const open = Number(cols[idx.open]);
        const high = Number(cols[idx.high]);
        const low = Number(cols[idx.low]);
        const volume = Number(cols[idx.volume]);
        bars.push({
            time,
            open: Number.isFinite(open) ? open : close,
            high: Number.isFinite(high) ? high : close,
            low: Number.isFinite(low) ? low : close,
            close,
            volume: Number.isFinite(volume) ? volume : 0,
        });
    }
    bars.sort((a, b) => a.time - b.time);
    return bars;
}

function barsToQuote(orbitfolioSymbol: string, bars: OhlcvBar[]): YahooQuote {
    const last = bars[bars.length - 1];
    const prev = bars.length >= 2 ? bars[bars.length - 2] : last;
    const price = last?.close ?? null;
    const previousClose = prev?.close ?? null;
    const change = price != null && previousClose != null ? price - previousClose : null;
    const changePercent = change != null && previousClose ? (change / previousClose) * 100 : null;
    let high = -Infinity;
    let low = Infinity;
    const window = bars.slice(-252);
    for (const b of window) {
        if (b.high > high) high = b.high;
        if (b.low < low) low = b.low;
    }
    const currency = orbitfolioSymbol.endsWith('.NS') || orbitfolioSymbol.endsWith('.BO')
        ? 'INR'
        : orbitfolioSymbol.endsWith('.TO') || orbitfolioSymbol.endsWith('.V')
            ? 'CAD'
            : 'USD';
    return {
        symbol: orbitfolioSymbol,
        name: orbitfolioSymbol,
        price,
        previousClose,
        change,
        changePercent,
        currency,
        exchange: '',
        marketState: 'UNKNOWN',
        fiftyTwoWeekHigh: Number.isFinite(high) ? high : null,
        fiftyTwoWeekLow: Number.isFinite(low) && low !== Infinity ? low : null,
    };
}

interface HttpsResult {
    status: number;
    body: string;
    headers: IncomingHttpHeaders;
}

function httpsGet(url: string, timeoutMs: number): Promise<HttpsResult> {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = https.request(
            {
                protocol: 'https:',
                hostname: u.hostname,
                port: 443,
                path: `${u.pathname}${u.search}`,
                method: 'GET',
                headers: {
                    Host: u.hostname,
                    'User-Agent': USER_AGENT,
                    Accept: 'text/csv,text/plain,*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                timeout: timeoutMs,
            },
            (res) => {
                const loc = res.headers.location;
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && loc) {
                    res.resume();
                    reject(new Error(`Stooq redirect ${res.statusCode}`));
                    return;
                }
                const chunks: Buffer[] = [];
                res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
                res.on('end', () => {
                    resolve({
                        status: res.statusCode || 0,
                        body: Buffer.concat(chunks).toString('utf8'),
                        headers: res.headers,
                    });
                });
            }
        );
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Stooq request timeout'));
        });
        req.on('error', reject);
        req.end();
    });
}

async function fetchCsv(stooqSym: string): Promise<string> {
    let challenge = false;
    for (const host of HOSTS) {
        const url = `${host}/q/d/l/?s=${encodeURIComponent(stooqSym)}&i=d`;
        try {
            const raw = await httpsGet(url, TIMEOUT_MS);
            if (raw.status < 200 || raw.status >= 300) continue;
            if (isStooqChallenge(raw.body)) {
                challenge = true;
                continue;
            }
            if (looksLikeStooqCsv(raw.body)) return raw.body;
        } catch (err) {
            console.warn(
                '[stooq] fetch failed',
                stooqSym,
                err instanceof Error ? err.message : 'error'
            );
        }
    }
    if (challenge) throw new Error('Stooq challenge page');
    throw new Error(`No Stooq CSV for ${stooqSym}`);
}

/**
 * Daily bars + YahooQuote-shaped quote. Throws cleanly on HTML/challenge or empty CSV.
 */
export async function fetchStooqChart(orbitfolioSymbol: string): Promise<ChartResult> {
    const candidates = stooqCandidates(orbitfolioSymbol);
    if (candidates.length === 0) {
        throw new Error(`Stooq skipped for ${orbitfolioSymbol}`);
    }
    let lastErr: Error | null = null;
    for (const ticker of candidates) {
        try {
            const csv = await fetchCsv(ticker);
            const bars = parseStooqCsv(csv);
            if (!bars.length) {
                lastErr = new Error(`Empty Stooq CSV for ${ticker}`);
                continue;
            }
            return {
                bars,
                quote: barsToQuote(orbitfolioSymbol.toUpperCase(), bars),
                source: 'stooq',
            };
        } catch (err) {
            lastErr = err instanceof Error ? err : new Error(String(err));
            if (lastErr.message.includes('challenge')) throw lastErr;
        }
    }
    throw lastErr ?? new Error(`No Stooq data for ${orbitfolioSymbol}`);
}
