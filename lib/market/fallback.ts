/**
 * Pure helpers for stale / offline analysis fallbacks.
 * Live Yahoo is preferred; these run only when the chart feed is empty.
 */

export const STALE_NOTE = 'Cached research · market feed refreshed when available';
export const OFFLINE_NOTE = 'offline research sample · live feed reconnecting';

export interface AnalysisMeta {
    stale?: boolean;
    source?: string;
}

export interface StaleGuidanceShape {
    analysis: {
        guidance: {
            rationale: string;
        };
    };
    meta?: AnalysisMeta;
}

export type FallbackChoice<T> =
    | { kind: 'live' }
    | { kind: 'stale'; view: T }
    | { kind: 'offline'; view: T }
    | { kind: 'none' };

/** Empty Yahoo (and Stooq) chart → stale if present, else offline seed view, else nothing. */
export function chooseAnalysisFallback<T>(input: {
    hasLiveChart: boolean;
    stale: T | null | undefined;
    offline: T | null | undefined;
}): FallbackChoice<T> {
    if (input.hasLiveChart) return { kind: 'live' };
    if (input.stale) return { kind: 'stale', view: input.stale };
    if (input.offline) return { kind: 'offline', view: input.offline };
    return { kind: 'none' };
}

export function applyStaleMark<T extends StaleGuidanceShape>(view: T): T {
    const rationale = view.analysis.guidance.rationale || '';
    const marked = rationale.includes(STALE_NOTE) ? rationale : `${STALE_NOTE}. ${rationale}`.trim();
    return {
        ...view,
        analysis: {
            ...view.analysis,
            guidance: {
                ...view.analysis.guidance,
                rationale: marked,
            },
        },
        meta: { stale: true, source: view.meta?.source || 'cache' },
    };
}

export function applyOfflineMark<T extends StaleGuidanceShape>(view: T): T {
    const rationale = view.analysis.guidance.rationale || '';
    const marked = rationale.toLowerCase().includes(OFFLINE_NOTE)
        ? rationale
        : `${OFFLINE_NOTE}. ${rationale}`.trim();
    return {
        ...view,
        analysis: {
            ...view.analysis,
            guidance: {
                ...view.analysis.guidance,
                rationale: marked,
            },
        },
        meta: { stale: true, source: 'offline' },
    };
}
