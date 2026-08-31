/**
 * Pure cache key helpers (no Redis). cache.ts re-exports the analysis/quote keys.
 */

export function staleAnalysisCacheKey(symbol: string): string {
    return `analysis-stale:w353532:${symbol.toUpperCase()}`;
}

export function staleQuoteCacheKey(symbol: string): string {
    return `quote-stale:${symbol.toUpperCase()}`;
}
