export type CsvMarket = 'US' | 'IN' | 'CA';
export type CsvAssetType = 'STOCK' | 'ETF' | 'OTHER';

export interface CsvHoldingRow {
    ticker: string;
    quantity: number;
    cost_price: number;
    asset_type: CsvAssetType;
    market: CsvMarket;
}

export interface CsvParseError {
    line: number;
    message: string;
}

export interface CsvParseResult {
    rows: CsvHoldingRow[];
    errors: CsvParseError[];
}

export const HOLDINGS_CSV_TEMPLATE =
    'ticker,quantity,cost_price,asset_type\n' +
    'AAPL,10,150.00,STOCK\n' +
    'RELIANCE.NS,20,2450,STOCK\n' +
    'SHOP.TO,8,95,STOCK\n';

const HEADER_ALIASES: Record<string, 'ticker' | 'quantity' | 'cost_price' | 'asset_type'> = {
    ticker: 'ticker',
    symbol: 'ticker',
    quantity: 'quantity',
    qty: 'quantity',
    cost_price: 'cost_price',
    costprice: 'cost_price',
    avg: 'cost_price',
    average: 'cost_price',
    average_price: 'cost_price',
    averageprice: 'cost_price',
    cost: 'cost_price',
    asset_type: 'asset_type',
    assettype: 'asset_type',
    type: 'asset_type',
};

export function inferMarketFromTicker(ticker: string): CsvMarket {
    const s = ticker.trim().toUpperCase();
    if (s.endsWith('.NS') || s.endsWith('.BO')) return 'IN';
    if (s.endsWith('.TO') || s.endsWith('.V')) return 'CA';
    return 'US';
}

function splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                cur += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            out.push(cur.trim());
            cur = '';
        } else {
            cur += ch;
        }
    }
    out.push(cur.trim());
    return out;
}

function parseAssetType(raw?: string): CsvAssetType {
    const v = (raw || 'STOCK').trim().toUpperCase();
    if (v === 'ETF') return 'ETF';
    if (v === 'OTHER') return 'OTHER';
    return 'STOCK';
}

function normalizeHeader(raw: string): string {
    return raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/**
 * Pure CSV holdings parser.
 * Format: ticker,quantity,cost_price,asset_type (asset_type optional).
 * Aliases: symbol, qty, avg.
 */
export function parseHoldingsCsv(text: string): CsvParseResult {
    const errors: CsvParseError[] = [];
    const rows: CsvHoldingRow[] = [];
    const seen = new Map<string, number>();

    if (text == null || !String(text).trim()) {
        return { rows: [], errors: [{ line: 0, message: 'CSV is empty' }] };
    }

    const cleaned = String(text).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleaned.split('\n');
    let headerIndex = -1;
    let headers: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim()) {
            headerIndex = i;
            headers = splitCsvLine(lines[i]).map(normalizeHeader);
            break;
        }
    }

    if (headerIndex < 0) {
        return { rows: [], errors: [{ line: 0, message: 'CSV is empty' }] };
    }

    const col: Partial<Record<'ticker' | 'quantity' | 'cost_price' | 'asset_type', number>> = {};
    headers.forEach((h, idx) => {
        const mapped = HEADER_ALIASES[h];
        if (mapped && col[mapped] == null) col[mapped] = idx;
    });

    if (col.ticker == null || col.quantity == null || col.cost_price == null) {
        return {
            rows: [],
            errors: [
                {
                    line: headerIndex + 1,
                    message: 'Header must include ticker/symbol, quantity/qty, and cost_price/avg',
                },
            ],
        };
    }

    for (let i = headerIndex + 1; i < lines.length; i++) {
        const raw = lines[i];
        if (!raw.trim()) continue;
        const cells = splitCsvLine(raw);
        const ticker = (cells[col.ticker] || '').trim().toUpperCase();
        const qtyRaw = cells[col.quantity] || '';
        const pxRaw = cells[col.cost_price] || '';
        const typeRaw = col.asset_type != null ? cells[col.asset_type] : '';
        const lineNo = i + 1;

        if (!ticker) {
            errors.push({ line: lineNo, message: 'Missing ticker' });
            continue;
        }
        const quantity = Number(qtyRaw);
        const cost_price = Number(pxRaw);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            errors.push({ line: lineNo, message: `Invalid quantity for ${ticker}` });
            continue;
        }
        if (!Number.isFinite(cost_price) || cost_price < 0) {
            errors.push({ line: lineNo, message: `Invalid cost_price for ${ticker}` });
            continue;
        }

        const row: CsvHoldingRow = {
            ticker,
            quantity,
            cost_price,
            asset_type: parseAssetType(typeRaw),
            market: inferMarketFromTicker(ticker),
        };

        const prev = seen.get(ticker);
        if (prev != null) {
            rows[prev] = row;
        } else {
            seen.set(ticker, rows.length);
            rows.push(row);
        }
    }

    if (rows.length === 0 && errors.length === 0) {
        errors.push({ line: headerIndex + 1, message: 'No holding rows found' });
    }

    return { rows, errors };
}
