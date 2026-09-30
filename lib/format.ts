export function formatMoney(value: number, currency: string, digits = 2): string {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            maximumFractionDigits: digits,
            minimumFractionDigits: digits,
        }).format(value);
    } catch {
        return `${currency} ${value.toFixed(digits)}`;
    }
}

export function formatNumber(value: number, digits = 2): string {
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
    }).format(value);
}

export function formatPct(value: number, digits = 2): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(digits)}%`;
}

export function inferMarket(symbol: string): 'US' | 'IN' | 'CA' {
    if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) return 'IN';
    if (symbol.endsWith('.TO') || symbol.endsWith('.V')) return 'CA';
    return 'US';
}

export function inferCurrency(market: 'US' | 'IN' | 'CA'): string {
    if (market === 'IN') return 'INR';
    if (market === 'CA') return 'CAD';
    return 'USD';
}

/**
 * Token-keyed status colors (Phase 3). These render every score badge;
 * they resolve through the semantic palette so a future light theme only
 * needs new CSS-variable values. Same visual output as before.
 */
export function labelColor(label: string): string {
    switch (label) {
        case 'Robust':
            return 'text-positive bg-positive/10 border-positive/20';
        case 'Constructive':
            return 'text-accent-bright bg-accent-bright/10 border-accent-bright/20';
        case 'Mixed':
            return 'text-ink-secondary bg-line/5 border-line/10';
        case 'Cautious':
            return 'text-warning bg-warning/10 border-warning/20';
        case 'Fragile':
            return 'text-negative bg-negative/10 border-negative/20';
        default:
            return 'text-ink-secondary bg-line/5 border-line/10';
    }
}

export function healthColor(grade: string): string {
    if (grade.startsWith('A')) return 'text-positive';
    if (grade === 'B') return 'text-accent-bright';
    if (grade === 'C') return 'text-ink-soft';
    if (grade === 'D') return 'text-warning';
    return 'text-negative';
}

export function actionColor(action: string): string {
    switch (action) {
        case 'Buy':
            return 'text-positive bg-positive/10 border-positive/20';
        case 'Hold':
            return 'text-warning bg-warning/10 border-warning/20';
        case 'Sell':
            return 'text-negative bg-negative/10 border-negative/20';
        default:
            return 'text-ink-secondary bg-line/5 border-line/10';
    }
}
