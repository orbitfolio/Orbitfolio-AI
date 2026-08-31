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

export function labelColor(label: string): string {
    switch (label) {
        case 'Robust':
            return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
        case 'Constructive':
            return 'text-teal-300 bg-teal-300/10 border-teal-300/20';
        case 'Mixed':
            return 'text-slate-300 bg-white/5 border-white/10';
        case 'Cautious':
            return 'text-amber-300 bg-amber-400/10 border-amber-400/20';
        case 'Fragile':
            return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
        default:
            return 'text-slate-300 bg-white/5 border-white/10';
    }
}

export function healthColor(grade: string): string {
    if (grade.startsWith('A')) return 'text-emerald-400';
    if (grade === 'B') return 'text-teal-300';
    if (grade === 'C') return 'text-slate-200';
    if (grade === 'D') return 'text-amber-300';
    return 'text-rose-400';
}

export function actionColor(action: string): string {
    switch (action) {
        case 'Buy':
            return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
        case 'Hold':
            return 'text-amber-300 bg-amber-400/10 border-amber-400/20';
        case 'Sell':
            return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
        default:
            return 'text-slate-300 bg-white/5 border-white/10';
    }
}
