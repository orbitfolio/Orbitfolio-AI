/**
 * Ticker search: local catalog (aliases + prefixes) merged with Yahoo,
 * unmatched Yahoo hits dropped so ITC/Enbridge/Diamond don't get buried.
 */

export interface SuggestHit {
    symbol: string;
    name: string;
    exchange: string;
    quoteType: string;
    typeDisp: string;
}

interface CatalogEntry {
    symbol: string;
    name: string;
    exchange: string;
    aliases: string[];
}

const CATALOG: CatalogEntry[] = [
    { symbol: 'RY.TO', name: 'Royal Bank of Canada', exchange: 'Toronto', aliases: ['rbc', 'royal', 'royal bank', 'royal bank of canada'] },
    { symbol: 'RY', name: 'Royal Bank of Canada', exchange: 'NYSE', aliases: ['rbc', 'royal', 'royal bank'] },
    { symbol: 'TD.TO', name: 'Toronto-Dominion Bank', exchange: 'Toronto', aliases: ['td', 'td bank', 'toronto', 'toronto dominion', 'toronto-dominion'] },
    { symbol: 'TD', name: 'Toronto-Dominion Bank', exchange: 'NYSE', aliases: ['td', 'td bank', 'toronto', 'toronto dominion'] },
    { symbol: 'BMO.TO', name: 'Bank of Montreal', exchange: 'Toronto', aliases: ['bmo', 'bank of montreal'] },
    { symbol: 'BMO', name: 'Bank of Montreal', exchange: 'NYSE', aliases: ['bmo', 'bank of montreal'] },
    { symbol: 'BNS.TO', name: 'Bank of Nova Scotia', exchange: 'Toronto', aliases: ['bns', 'scotia', 'scotiabank', 'nova scotia'] },
    { symbol: 'BNS', name: 'Bank of Nova Scotia', exchange: 'NYSE', aliases: ['bns', 'scotia', 'scotiabank'] },
    { symbol: 'CM.TO', name: 'Canadian Imperial Bank of Commerce', exchange: 'Toronto', aliases: ['cibc', 'cm', 'imperial bank'] },
    { symbol: 'CM', name: 'Canadian Imperial Bank of Commerce', exchange: 'NYSE', aliases: ['cibc', 'cm'] },
    { symbol: 'NA.TO', name: 'National Bank of Canada', exchange: 'Toronto', aliases: ['nbc', 'national bank'] },
    { symbol: 'ENB.TO', name: 'Enbridge Inc.', exchange: 'Toronto', aliases: ['enb', 'enbr', 'enbridge'] },
    { symbol: 'ENB', name: 'Enbridge Inc.', exchange: 'NYSE', aliases: ['enb', 'enbr', 'enbridge'] },
    { symbol: 'TRP.TO', name: 'TC Energy Corp.', exchange: 'Toronto', aliases: ['trp', 'tc energy', 'transcanada'] },
    { symbol: 'SU.TO', name: 'Suncor Energy Inc.', exchange: 'Toronto', aliases: ['su', 'suncor'] },
    { symbol: 'CNQ.TO', name: 'Canadian Natural Resources', exchange: 'Toronto', aliases: ['cnq', 'canadian natural'] },
    { symbol: 'SHOP.TO', name: 'Shopify Inc.', exchange: 'Toronto', aliases: ['shop', 'shopify'] },
    { symbol: 'SHOP', name: 'Shopify Inc.', exchange: 'NYSE', aliases: ['shop', 'shopify'] },
    { symbol: 'CP.TO', name: 'Canadian Pacific Kansas City', exchange: 'Toronto', aliases: ['cp', 'cpkc', 'canadian pacific'] },
    { symbol: 'CNR.TO', name: 'Canadian National Railway', exchange: 'Toronto', aliases: ['cnr', 'cn rail', 'canadian national'] },
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'Nasdaq', aliases: ['apple', 'aapl'] },
    { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'Nasdaq', aliases: ['microsoft', 'msft'] },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'Nasdaq', aliases: ['nvidia', 'nvda'] },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'Nasdaq', aliases: ['google', 'alphabet', 'googl'] },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'Nasdaq', aliases: ['amazon', 'amzn'] },
    { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'Nasdaq', aliases: ['meta', 'facebook', 'fb'] },
    { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'Nasdaq', aliases: ['tesla', 'tsla'] },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', aliases: ['jpm', 'jpmorgan', 'jp morgan', 'chase'] },
    { symbol: 'BAC', name: 'Bank of America Corp.', exchange: 'NYSE', aliases: ['bac', 'bank of america', 'bofa'] },
    { symbol: 'WFC', name: 'Wells Fargo & Company', exchange: 'NYSE', aliases: ['wfc', 'wells', 'wells fargo'] },
    { symbol: 'GS', name: 'Goldman Sachs Group Inc.', exchange: 'NYSE', aliases: ['gs', 'goldman', 'goldman sachs'] },
    { symbol: 'MS', name: 'Morgan Stanley', exchange: 'NYSE', aliases: ['ms', 'morgan stanley'] },
    { symbol: 'ITC.NS', name: 'ITC Ltd', exchange: 'NSE', aliases: ['itc', 'itc limited', 'itc ltd'] },
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd', exchange: 'NSE', aliases: ['reliance', 'ril'] },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services', exchange: 'NSE', aliases: ['tcs', 'tata consultancy'] },
    { symbol: 'INFY.NS', name: 'Infosys Ltd', exchange: 'NSE', aliases: ['infy', 'infosys'] },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd', exchange: 'NSE', aliases: ['hdfc', 'hdfc bank'] },
    { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd', exchange: 'NSE', aliases: ['icici', 'icici bank'] },
    { symbol: 'SBIN.NS', name: 'State Bank of India', exchange: 'NSE', aliases: ['sbi', 'state bank'] },
    { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel Ltd', exchange: 'NSE', aliases: ['airtel', 'bharti'] },
    { symbol: 'DIACABS.NS', name: 'Diamond Power Infrastructure Ltd', exchange: 'NSE', aliases: ['diam', 'diamond', 'diamond power', 'diamond cable', 'diamond cables', 'diacabs', 'dicabs'] },
    { symbol: 'POLYCAB.NS', name: 'Polycab India Ltd', exchange: 'NSE', aliases: ['polycab'] },
    { symbol: 'WIPRO.NS', name: 'Wipro Ltd', exchange: 'NSE', aliases: ['wipro'] },
    { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever Ltd', exchange: 'NSE', aliases: ['hul', 'unilever', 'hindustan unilever'] },
    { symbol: 'TATAMOTORS.NS', name: 'Tata Motors Ltd', exchange: 'NSE', aliases: ['tata motors', 'tatamotors'] },
    { symbol: 'MARUTI.NS', name: 'Maruti Suzuki India Ltd', exchange: 'NSE', aliases: ['maruti', 'suzuki'] },
    { symbol: 'LT.NS', name: 'Larsen & Toubro Ltd', exchange: 'NSE', aliases: ['lt', 'l&t', 'larsen'] },
    { symbol: 'ONGC.NS', name: 'Oil & Natural Gas Corp.', exchange: 'NSE', aliases: ['ongc'] },
    { symbol: 'NTPC.NS', name: 'NTPC Ltd', exchange: 'NSE', aliases: ['ntpc'] },
    { symbol: 'POWERGRID.NS', name: 'Power Grid Corp. of India', exchange: 'NSE', aliases: ['powergrid', 'power grid'] },
    { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank', exchange: 'NSE', aliases: ['kotak'] },
    { symbol: 'AXISBANK.NS', name: 'Axis Bank Ltd', exchange: 'NSE', aliases: ['axis', 'axis bank'] },
    { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance Ltd', exchange: 'NSE', aliases: ['bajaj finance', 'bajfinance'] },
    { symbol: 'ADANIENT.NS', name: 'Adani Enterprises Ltd', exchange: 'NSE', aliases: ['adani'] },
];

function norm(s: string): string {
    return s.trim().toLowerCase().replace(/[^a-z0-9.]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function bareSymbol(symbol: string): string {
    return symbol.split('.')[0].toLowerCase();
}

function catalogToHit(entry: CatalogEntry): SuggestHit {
    return {
        symbol: entry.symbol,
        name: entry.name,
        exchange: entry.exchange,
        quoteType: 'EQUITY',
        typeDisp: 'Equity',
    };
}

export function relevanceScore(query: string, symbol: string, name: string, aliases: string[] = []): number {
    const q = norm(query);
    if (!q) return 0;
    const sym = norm(symbol);
    const bare = bareSymbol(symbol);
    const nm = norm(name);
    const als = aliases.map(norm);
    const words = nm.split(' ').filter(Boolean);

    if (als.includes(q)) return 100;
    if (sym === q || bare === q) return 96;
    if (nm === q) return 90;
    if (sym.startsWith(q) || bare.startsWith(q)) return 88;
    if (als.some((a) => a.startsWith(q))) return 86;
    if (nm.startsWith(q)) return 80;
    if (words.some((w) => w.startsWith(q))) return 74;
    if (q.length >= 4 && als.some((a) => a.includes(q))) return 62;
    if (q.length >= 4 && (nm.includes(q) || sym.includes(q))) return 50;
    return 0;
}

export function suggestFromCatalog(query: string, limit = 12): SuggestHit[] {
    const q = norm(query);
    if (!q) return [];
    const scored: { hit: SuggestHit; score: number }[] = [];
    for (const entry of CATALOG) {
        const score = relevanceScore(q, entry.symbol, entry.name, entry.aliases);
        if (score <= 0) continue;
        scored.push({ hit: catalogToHit(entry), score });
    }
    scored.sort((a, b) => b.score - a.score || a.hit.symbol.localeCompare(b.hit.symbol));
    return scored.slice(0, limit).map((s) => s.hit);
}

export function isSearchableQuote(input: { symbol?: string; quoteType?: string }): boolean {
    const sym = input.symbol || '';
    if (!sym || sym.includes('=') || sym.startsWith('^')) return false;
    const t = (input.quoteType || '').toUpperCase();
    if (['OPTION', 'FUTURE', 'CURRENCY', 'CRYPTOCURRENCY', 'INDEX', 'ECNQUOTE', 'MUTUALFUND'].includes(t)) {
        return false;
    }
    return true;
}

function aliasesFor(symbol: string): string[] {
    const key = symbol.toUpperCase();
    return CATALOG.find((e) => e.symbol.toUpperCase() === key)?.aliases ?? [];
}

export function mergeSuggestions(
    query: string,
    local: SuggestHit[],
    remote: SuggestHit[],
    limit = 12
): SuggestHit[] {
    const q = norm(query);
    const bySym = new Map<string, { hit: SuggestHit; score: number }>();
    const consider = (hit: SuggestHit) => {
        if (!isSearchableQuote(hit)) return;
        const key = hit.symbol.toUpperCase();
        const score = relevanceScore(q, hit.symbol, hit.name, aliasesFor(hit.symbol));
        if (score <= 0) return;
        const prev = bySym.get(key);
        const bump = (hit.quoteType || '').toUpperCase() === 'EQUITY' ? 0.1 : 0;
        const next = score + bump;
        if (!prev || next > prev.score) bySym.set(key, { hit, score: next });
    };
    for (const hit of local) consider(hit);
    for (const hit of remote) consider(hit);
    return [...bySym.values()]
        .sort((a, b) => b.score - a.score || a.hit.symbol.localeCompare(b.hit.symbol))
        .slice(0, limit)
        .map((row) => row.hit);
}
