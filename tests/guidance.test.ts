import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    FORBIDDEN_TRADE_ACTIONS,
    GuidanceLabelSchema,
    GuidanceSchema,
    StockAnalysisSchema,
} from '../lib/ai/schemas';
import { buildTemplateRationale, combineRating } from '../lib/market/rating';

test('guidance labels never include buy/sell/hold/trim/accumulate', () => {
    const labels = GuidanceLabelSchema.options;
    for (const banned of FORBIDDEN_TRADE_ACTIONS) {
        assert.equal(
            (labels as string[]).includes(banned),
            false,
            `label set must not include ${banned}`
        );
        assert.equal(
            (labels as string[]).includes(banned[0] + banned.slice(1).toLowerCase()),
            false,
            `label set must not include title-case ${banned}`
        );
    }
    assert.deepEqual(labels, ['Robust', 'Constructive', 'Mixed', 'Cautious', 'Fragile']);
});

test('GuidanceSchema accepts action Buy/Hold/Sell', () => {
    for (const action of ['Buy', 'Hold', 'Sell'] as const) {
        const parsed = GuidanceSchema.safeParse({
            orbitScore: action === 'Buy' ? 7 : action === 'Hold' ? 5 : 2,
            label: action === 'Buy' ? 'Constructive' : action === 'Hold' ? 'Mixed' : 'Fragile',
            action,
            pillars: { technical: 5, fundamental: 5, analystConsensus: 5 },
            rationale: `Client action: ${action} based on Orbit score 5/10.`,
        });
        assert.equal(parsed.success, true, parsed.success ? '' : parsed.error.message);
    }
});

test('GuidanceSchema still rejects a buy/sell-style signal object', () => {
    const parsed = GuidanceSchema.safeParse({
        type: 'BUY',
        confidence: 90,
        reasoning: 'Buy the dip',
    });
    assert.equal(parsed.success, false);
});

test('serialized analysis includes Client action and keeps research labels descriptive', () => {
    const combined = combineRating({
        fundamental: 7,
        technical: 6,
        analystConsensus: 5,
    });
    const rationale = buildTemplateRationale({
        symbol: 'AAPL',
        label: combined.label,
        action: combined.action,
        orbitScore: combined.orbitScore,
        technical: combined.pillars.technical,
        fundamental: combined.pillars.fundamental,
        analystConsensus: combined.pillars.analystConsensus,
        analystAvailable: true,
        rsi: 52,
        pe: 28,
    });
    const analysis = StockAnalysisSchema.parse({
        symbol: 'AAPL',
        orbitScore: combined.orbitScore,
        breakdown: {
            technical: combined.pillars.technical,
            fundamental: combined.pillars.fundamental,
            sentiment: 5,
            risk: 4,
        },
        guidance: {
            orbitScore: combined.orbitScore,
            label: combined.label,
            action: combined.action,
            pillars: combined.pillars,
            rationale,
            analystRaw: { recommendationKey: 'buy', numberOfAnalysts: 40 },
            weightsUsed: combined.weightsUsed,
            analystAvailable: combined.analystAvailable,
        },
        opportunities: [],
        risks: [],
        generatedAt: new Date().toISOString(),
    });

    assert.match(analysis.guidance.rationale, /Client action: Hold based on Orbit score /);
    assert.match(analysis.guidance.rationale, /research guidance for clients, not personalized regulated advice/i);
    assert.equal(analysis.guidance.action, 'Hold');
    assert.equal(
        analysis.guidance.label === 'Buy' || analysis.guidance.label === 'Sell',
        false
    );
    assert.equal(
        (GuidanceLabelSchema.options as string[]).includes(analysis.guidance.label),
        true
    );
});
