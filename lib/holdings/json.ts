export type HoldingsMarket = 'US' | 'IN' | 'CA';
export type HoldingsAssetType = 'STOCK' | 'ETF' | 'OTHER';

export interface HoldingsJsonRow {
    id?: string;
    symbol: string;
    name: string;
    quantity: number;
    averagePrice: number;
    currency: string;
    market: HoldingsMarket;
    assetType: HoldingsAssetType;
}

export interface HoldingsJsonFile {
    version: 1;
    deviceOnly: true;
    exportedAt: string;
    holdings: HoldingsJsonRow[];
}

export interface HoldingsJsonParseResult {
    holdings: HoldingsJsonRow[];
    error: string | null;
}

const MARKETS = new Set<HoldingsMarket>(['US', 'IN', 'CA']);
const ASSET_TYPES = new Set<HoldingsAssetType>(['STOCK', 'ETF', 'OTHER']);

function inferMarket(symbol: string): HoldingsMarket {
    const s = symbol.toUpperCase();
    if (s.endsWith('.NS') || s.endsWith('.BO')) return 'IN';
    if (s.endsWith('.TO') || s.endsWith('.V')) return 'CA';
    return 'US';
}

function inferCurrency(market: HoldingsMarket, raw?: unknown): string {
    if (typeof raw === 'string' && raw.trim()) return raw.trim().toUpperCase();
    if (market === 'IN') return 'INR';
    if (market === 'CA') return 'CAD';
    return 'USD';
}

function asRow(raw: unknown): HoldingsJsonRow | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const symbol = typeof o.symbol === 'string' ? o.symbol.trim().toUpperCase() : '';
    if (!symbol) return null;
    const quantity = Number(o.quantity);
    const averagePrice = Number(o.averagePrice);
    if (!Number.isFinite(quantity) || quantity <= 0) return null;
    if (!Number.isFinite(averagePrice) || averagePrice < 0) return null;
    const marketRaw = typeof o.market === 'string' ? o.market.toUpperCase() : '';
    const market = MARKETS.has(marketRaw as HoldingsMarket)
        ? (marketRaw as HoldingsMarket)
        : inferMarket(symbol);
    const assetRaw = typeof o.assetType === 'string' ? o.assetType.toUpperCase() : 'STOCK';
    const assetType = ASSET_TYPES.has(assetRaw as HoldingsAssetType)
        ? (assetRaw as HoldingsAssetType)
        : 'STOCK';
    const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim() : symbol;
    const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : undefined;
    return {
        id,
        symbol,
        name,
        quantity,
        averagePrice,
        currency: inferCurrency(market, o.currency),
        market,
        assetType,
    };
}

export function serializeHoldingsJson(holdings: HoldingsJsonRow[]): string {
    const payload: HoldingsJsonFile = {
        version: 1,
        deviceOnly: true,
        exportedAt: new Date().toISOString(),
        holdings: holdings.map((h) => ({
            id: h.id,
            symbol: h.symbol,
            name: h.name,
            quantity: h.quantity,
            averagePrice: h.averagePrice,
            currency: h.currency,
            market: h.market,
            assetType: h.assetType,
        })),
    };
    return `${JSON.stringify(payload, null, 2)}\n`;
}

export function parseHoldingsJson(text: string): HoldingsJsonParseResult {
    if (text == null || !String(text).trim()) {
        return { holdings: [], error: 'File is empty' };
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(String(text));
    } catch {
        return { holdings: [], error: 'Not valid JSON' };
    }

    const list = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray((parsed as { holdings?: unknown }).holdings)
            ? (parsed as { holdings: unknown[] }).holdings
            : null;

    if (!list) {
        return { holdings: [], error: 'JSON must be an array or { holdings: [] }' };
    }

    const holdings: HoldingsJsonRow[] = [];
    const seen = new Set<string>();
    for (const item of list) {
        const row = asRow(item);
        if (!row) continue;
        if (seen.has(row.symbol)) {
            const idx = holdings.findIndex((h) => h.symbol === row.symbol);
            if (idx >= 0) holdings[idx] = row;
            continue;
        }
        seen.add(row.symbol);
        holdings.push(row);
    }

    if (holdings.length === 0) {
        return { holdings: [], error: 'No valid holdings in file' };
    }
    return { holdings, error: null };
}
