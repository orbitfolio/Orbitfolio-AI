/**
 * Combine pillars into orbitScore + research label + client action.
 * Deterministic. No LLM required for the score.
 *
 * Research labels stay descriptive (Robust…Fragile).
 * Client action (Buy / Hold / Sell) is derived from orbitScore for clients.
 * Pillars: technical 35%, fundamental 35%, analyst 30% (renormalize if analyst missing).
 */

import type { GuidanceLabel } from '../ai/schemas';

export const PILLAR_WEIGHTS = {
    technical: 0.35,
    fundamental: 0.35,
    analystConsensus: 0.3,
} as const;

export type ClientAction = 'Buy' | 'Hold' | 'Sell';

export interface PillarScores {
    technical: number;
    fundamental: number;
    analystConsensus: number | null;
}

export interface CombinedRating {
    orbitScore: number;
    label: GuidanceLabel;
    action: ClientAction;
    analystAvailable: boolean;
    pillars: {
        technical: number;
        fundamental: number;
        analystConsensus: number;
    };
    weightsUsed: {
        technical: number;
        fundamental: number;
        analystConsensus: number;
    };
}

export function labelFromScore(score: number): GuidanceLabel {
    if (score >= 8.0) return 'Robust';
    if (score >= 6.5) return 'Constructive';
    if (score >= 5.0) return 'Mixed';
    if (score >= 3.5) return 'Cautious';
    return 'Fragile';
}

export function actionFromScore(score: number): ClientAction {
    if (score >= 6.5) return 'Buy';
    if (score >= 4.0) return 'Hold';
    return 'Sell';
}

function clamp10(n: number): number {
    return Math.min(10, Math.max(0, n));
}

export function combineRating(pillars: PillarScores): CombinedRating {
    const technical = clamp10(pillars.technical);
    const fundamental = clamp10(pillars.fundamental);
    const hasAnalyst = pillars.analystConsensus != null && Number.isFinite(pillars.analystConsensus);
    const analyst = hasAnalyst ? clamp10(pillars.analystConsensus as number) : 0;

    let wF = PILLAR_WEIGHTS.fundamental;
    let wT = PILLAR_WEIGHTS.technical;
    let wA = hasAnalyst ? PILLAR_WEIGHTS.analystConsensus : 0;
    const sum = wF + wT + wA;
    wF /= sum;
    wT /= sum;
    wA /= sum;

    const raw = fundamental * wF + technical * wT + analyst * wA;
    const orbitScore = Math.round(clamp10(raw) * 10) / 10;

    return {
        orbitScore,
        label: labelFromScore(orbitScore),
        action: actionFromScore(orbitScore),
        analystAvailable: hasAnalyst,
        pillars: {
            technical: Math.round(technical * 10) / 10,
            fundamental: Math.round(fundamental * 10) / 10,
            // Schema requires a number; UI uses analystAvailable to show N/A.
            analystConsensus: hasAnalyst ? Math.round(analyst * 10) / 10 : 5,
        },
        weightsUsed: {
            technical: Math.round(wT * 1000) / 1000,
            fundamental: Math.round(wF * 1000) / 1000,
            analystConsensus: Math.round(wA * 1000) / 1000,
        },
    };
}

export function healthRatingFromScore(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 8) return 'A+';
    if (score >= 7) return 'A';
    if (score >= 6) return 'B';
    if (score >= 5) return 'C';
    if (score >= 3.5) return 'D';
    return 'F';
}

export function buildTemplateRationale(input: {
    symbol: string;
    label: GuidanceLabel;
    action: ClientAction;
    orbitScore: number;
    technical: number;
    fundamental: number;
    analystConsensus: number;
    analystAvailable: boolean;
    rsi?: number | null;
    pe?: number | null;
}): string {
    return `${input.symbol} screens as ${input.label} (${input.orbitScore}/10). Client action: ${input.action} based on Orbit score ${input.orbitScore}/10. This is research guidance for clients, not personalized regulated advice.`;
}
