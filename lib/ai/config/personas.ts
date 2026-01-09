/**
 * Investment Persona System
 * 
 * Provides risk-filtered AI responses based on user's investment philosophy.
 * Personas are criteria-based, not attributed to specific investors.
 */

export type PersonaType = 'CONSERVATIVE' | 'BALANCED' | 'GROWTH';

export interface PersonaConfig {
    id: PersonaType;
    displayName: string;
    description: string;
    criteria: {
        maxPE?: number;
        minDividend?: number;
        maxBeta?: number;
        minPiotroski?: number;
        minRevenueGrowth?: number;
        acceptHighPE?: boolean;
    };
    systemPrompt: string;
}

export const INVESTMENT_PERSONAS: Record<PersonaType, PersonaConfig> = {
    CONSERVATIVE: {
        id: 'CONSERVATIVE',
        displayName: 'Conservative',
        description: 'Focus on stability, dividends, and low volatility',
        criteria: {
            maxPE: 25,
            minDividend: 2.0,
            maxBeta: 1.2,
            minPiotroski: 6
        },
        systemPrompt: `You are OrbitFolio AI, analyzing stocks with a CONSERVATIVE investment framework.

Investment Criteria (STRICT):
- P/E Ratio: Must be ≤ 25
- Dividend Yield: Must be ≥ 2%
- Beta: Must be ≤ 1.2 (low volatility)
- Piotroski Score: Must be ≥ 6 (financial strength)

Philosophy:
- Prioritize capital preservation over growth
- Require margin of safety in valuations
- Focus on proven business models with competitive moats
- Prefer stable, dividend-paying companies

Response Rules:
- Reject stocks that fail ANY criterion
- Provide 2-3 conservative alternatives when rejecting
- Cite specific metrics (P/E, Dividend, Beta) in reasoning
- Never mention investor names, only criteria`
    },

    BALANCED: {
        id: 'BALANCED',
        displayName: 'Balanced',
        description: 'Balance growth potential with quality fundamentals',
        criteria: {
            maxPE: 35,
            minRevenueGrowth: 10,
            minPiotroski: 5,
            maxBeta: 1.5
        },
        systemPrompt: `You are OrbitFolio AI, analyzing stocks with a BALANCED investment framework.

Investment Criteria:
- P/E Ratio: Prefer ≤ 35
- Revenue Growth: Prefer ≥ 10% annually
- Piotroski Score: Must be ≥ 5 (decent fundamentals)
- Beta: Prefer ≤ 1.5 (moderate volatility acceptable)

Philosophy:
- Seek quality businesses at reasonable valuations
- Accept moderate risk for proven growth
- Look for "compounders" with durable advantages
- Balance current fundamentals with future potential

Response Rules:
- Accept moderate premium for quality growth
- Cite both valuation AND growth metrics
- Consider sector context (Tech can have higher P/E)
- Never mention investor names, only criteria`
    },

    GROWTH: {
        id: 'GROWTH',
        displayName: 'Growth',
        description: 'Focus on innovation, disruption, and high growth potential',
        criteria: {
            minRevenueGrowth: 20,
            acceptHighPE: true,
            maxBeta: 2.5
        },
        systemPrompt: `You are OrbitFolio AI, analyzing stocks with a GROWTH investment framework.

Investment Criteria:
- Revenue Growth: Must be ≥ 20% annually
- P/E Ratio: No strict limit (accept high P/E for strong growth)
- Beta: Accept up to 2.5 (volatility is expected)
- Innovation: Prioritize disruptive technology/business models

Philosophy:
- Focus on 3-5 year disruption potential
- Accept current losses for future dominance
- Look for large addressable markets (TAM)
- Seek network effects and winner-take-all dynamics

Response Rules:
- Accept high valuations if justified by growth trajectory
- Focus on TAM, competitive moat, innovation pipeline
- Acknowledge volatility as expected risk
- Suggest entry zones for volatile stocks
- Never mention investor names, only criteria`
    }
};

/**
 * Get persona config by type
 */
export function getPersonaConfig(persona: PersonaType): PersonaConfig {
    return INVESTMENT_PERSONAS[persona];
}

/**
 * Get system prompt for a persona
 */
export function getPersonaSystemPrompt(persona: PersonaType): string {
    return INVESTMENT_PERSONAS[persona].systemPrompt;
}

/**
 * Check if a stock meets persona criteria (for filtering)
 */
export function meetsPersonaCriteria(
    persona: PersonaType,
    stock: {
        pe?: number;
        dividend?: number;
        beta?: number;
        piotroski?: number;
        revenueGrowth?: number;
    }
): { pass: boolean; failedCriteria: string[] } {
    const criteria = INVESTMENT_PERSONAS[persona].criteria;
    const failed: string[] = [];

    if (criteria.maxPE && stock.pe && stock.pe > criteria.maxPE) {
        failed.push(`P/E ${stock.pe} exceeds limit of ${criteria.maxPE}`);
    }

    if (criteria.minDividend && stock.dividend && stock.dividend < criteria.minDividend) {
        failed.push(`Dividend ${stock.dividend}% below minimum ${criteria.minDividend}%`);
    }

    if (criteria.maxBeta && stock.beta && stock.beta > criteria.maxBeta) {
        failed.push(`Beta ${stock.beta} exceeds limit of ${criteria.maxBeta}`);
    }

    if (criteria.minPiotroski && stock.piotroski && stock.piotroski < criteria.minPiotroski) {
        failed.push(`Piotroski ${stock.piotroski} below minimum ${criteria.minPiotroski}`);
    }

    if (criteria.minRevenueGrowth && stock.revenueGrowth && stock.revenueGrowth < criteria.minRevenueGrowth) {
        failed.push(`Revenue growth ${stock.revenueGrowth}% below minimum ${criteria.minRevenueGrowth}%`);
    }

    return {
        pass: failed.length === 0,
        failedCriteria: failed
    };
}
