/**
 * Tiny built-in daily OHLCV for demo holdings only.
 * Used when live Yahoo/Stooq and stale analysis are all missing.
 *
 * Each demo ticker has a distinct PROFILE so technical scores (and
 * therefore client actions) actually differ across the sample book.
 */

import type { OhlcvBar } from './technicals';
import type { YahooQuote } from './yahoo';

export type SeedProfile =
    | 'strong_up'
    | 'mild_up'
    | 'volatile_up'
    | 'sideways'
    | 'mild_down'
    | 'recovery_then_up';

export interface OfflineSeed {
    symbol: string;
    name: string;
    currency: string;
    exchange: string;
    lastPrice: number;
    profile: SeedProfile;
    bars: OhlcvBar[];
}

const SPECS: Record<
    string,
    { name: string; currency: string; exchange: string; lastPrice: number; profile: SeedProfile }
> = {
    AAPL: { name: 'Apple Inc.', currency: 'USD', exchange: 'NMS', lastPrice: 316.85, profile: 'strong_up' },
    MSFT: { name: 'Microsoft Corp.', currency: 'USD', exchange: 'NMS', lastPrice: 428.5, profile: 'mild_up' },
    NVDA: { name: 'NVIDIA Corp.', currency: 'USD', exchange: 'NMS', lastPrice: 126.4, profile: 'volatile_up' },
    'RELIANCE.NS': {
        name: 'Reliance Industries',
        currency: 'INR',
        exchange: 'NSI',
        lastPrice: 2450,
        profile: 'sideways',
    },
    'INFY.NS': { name: 'Infosys Ltd', currency: 'INR', exchange: 'NSI', lastPrice: 1480, profile: 'mild_down' },
    'SHOP.TO': { name: 'Shopify Inc.', currency: 'CAD', exchange: 'TOR', lastPrice: 95, profile: 'recovery_then_up' },
};

const DAYS = 220;
/** Fixed epoch so seeds are deterministic across runs. */
const END_UTC = Date.UTC(2026, 7, 29);

function relativePath(profile: SeedProfile, t: number): number {
    // t in [0, 1], value is price / lastPrice (before pinning last close).
    switch (profile) {
        case 'strong_up': {
            // +25% over the window, with a brief overshoot so last is not the 52w high.
            const base = 1 / 1.25 + t * (1 - 1 / 1.25);
            const bump = Math.exp(-(((t - 0.82) / 0.06) ** 2)) * 0.08;
            return base + bump;
        }
        case 'mild_up':
            // +10% over the window.
            return 1 / 1.1 + t * (1 - 1 / 1.1);
        case 'volatile_up':
            // +20% overall, extra wave added as noise later.
            return 1 / 1.2 + t * (1 - 1 / 1.2);
        case 'sideways':
            return 1 + Math.sin(t * Math.PI * 4) * 0.04;
        case 'mild_down':
            // -22% over the window (starts higher) so the demo book includes a Sell.
            return 1 / 0.78 + t * (1 - 1 / 0.78);
        case 'recovery_then_up': {
            if (t < 0.45) {
                const u = t / 0.45;
                return 1.08 * (1 - u) + 0.78 * u;
            }
            const u = (t - 0.45) / 0.55;
            return 0.78 * (1 - u) + 1 * u;
        }
        default:
            return 1;
    }
}

function noiseAmp(profile: SeedProfile): number {
    switch (profile) {
        case 'volatile_up':
            return 0.022;
        case 'sideways':
            return 0.008;
        case 'recovery_then_up':
            return 0.01;
        case 'strong_up':
            return 0.003;
        case 'mild_up':
            return 0.004;
        case 'mild_down':
            return 0.0015;
        default:
            return 0.005;
    }
}

export function synthBars(lastPrice: number, profile: SeedProfile): OhlcvBar[] {
    const amp = noiseAmp(profile);
    const salt = profile.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const raw: number[] = new Array(DAYS);
    for (let i = 0; i < DAYS; i++) {
        const t = i / (DAYS - 1);
        const wave =
            Math.sin((i + salt) * 0.37) * amp + Math.cos((i + salt) * 0.11) * amp * 0.45;
        raw[i] = lastPrice * relativePath(profile, t) * (1 + wave);
    }
    raw[DAYS - 1] = lastPrice;

    const bars: OhlcvBar[] = [];
    for (let i = 0; i < DAYS; i++) {
        const close = raw[i];
        const open = i === 0 ? close : bars[i - 1].close;
        const span = Math.abs(Math.sin((i + salt) * 0.17)) * (profile === 'volatile_up' ? 0.018 : 0.008);
        const high = Math.max(open, close) * (1 + span);
        const low = Math.min(open, close) * (1 - span);
        bars.push({
            time: END_UTC - (DAYS - 1 - i) * 86400000,
            open,
            high,
            low,
            close,
            volume: 1_000_000 + ((i * 9973 + salt * 13) % 4_000_000),
        });
    }
    return bars;
}

export function isDemoSymbol(symbol: string): boolean {
    return Object.prototype.hasOwnProperty.call(SPECS, symbol.trim().toUpperCase());
}

export function getOfflineSeed(symbol: string): OfflineSeed | null {
    const sym = symbol.trim().toUpperCase();
    const spec = SPECS[sym];
    if (!spec) return null;
    return {
        symbol: sym,
        name: spec.name,
        currency: spec.currency,
        exchange: spec.exchange,
        lastPrice: spec.lastPrice,
        profile: spec.profile,
        bars: synthBars(spec.lastPrice, spec.profile),
    };
}

export function scaleBarsToPrice(bars: OhlcvBar[], lastPrice: number): OhlcvBar[] {
    if (!bars.length || !Number.isFinite(lastPrice) || lastPrice <= 0) return bars;
    const current = bars[bars.length - 1].close;
    if (!current) return bars;
    const factor = lastPrice / current;
    return bars.map((b) => ({
        ...b,
        open: b.open * factor,
        high: b.high * factor,
        low: b.low * factor,
        close: b.close * factor,
    }));
}

export function quoteFromSeed(seed: OfflineSeed, bars: OhlcvBar[], last?: YahooQuote | null): YahooQuote {
    const lastBar = bars[bars.length - 1];
    const prev = bars.length >= 2 ? bars[bars.length - 2] : lastBar;
    const price = last?.price ?? lastBar?.close ?? seed.lastPrice;
    const previousClose = last?.previousClose ?? prev?.close ?? price;
    const change = price != null && previousClose != null ? price - previousClose : null;
    const changePercent = change != null && previousClose ? (change / previousClose) * 100 : null;
    let high = -Infinity;
    let low = Infinity;
    for (const b of bars.slice(-252)) {
        if (b.high > high) high = b.high;
        if (b.low < low) low = b.low;
    }
    return {
        symbol: seed.symbol,
        name: last?.name || seed.name,
        price,
        previousClose,
        change,
        changePercent,
        currency: last?.currency || seed.currency,
        exchange: last?.exchange || seed.exchange,
        marketState: last?.marketState || 'CLOSED',
        fiftyTwoWeekHigh: last?.fiftyTwoWeekHigh ?? (Number.isFinite(high) ? high : null),
        fiftyTwoWeekLow: last?.fiftyTwoWeekLow ?? (Number.isFinite(low) && low !== Infinity ? low : null),
    };
}
