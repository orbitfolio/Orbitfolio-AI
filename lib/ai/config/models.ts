/**
 * AI Model Configuration
 * 
 * Centralized model definitions, costs, and selection rules.
 * Change models without touching code!
 */

export interface ModelConfig {
    provider: string;
    model: string;
    maxTokens: number;
    temperature: number;
    costPer1MTokens: number; // USD
    rateLimit: number; // requests per day (free tier)
    useCases: string[];
}

export const AI_MODELS: Record<string, ModelConfig> = {
    // Groq - Fast & Free
    groq_llama33: {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        maxTokens: 8000,
        temperature: 0.7,
        costPer1MTokens: 0.59,
        rateLimit: 14_400, // 14.4K requests/day free tier
        useCases: ['chat', 'analysis', 'fast_insights', 'classification']
    },

    // Future: OpenAI GPT-4
    openai_gpt4: {
        provider: 'openai',
        model: 'gpt-4-turbo',
        maxTokens: 4096,
        temperature: 0.5,
        costPer1MTokens: 10.00, // $10 per 1M tokens
        rateLimit: 500, // Varies by tier
        useCases: ['deep_analysis', 'complex_reasoning', 'code_generation']
    },

    // Future: Anthropic Claude
    claude_sonnet: {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 8192,
        temperature: 0.7,
        costPer1MTokens: 3.00,
        rateLimit: 1000,
        useCases: ['analysis', 'reasoning', 'long_context']
    }
};

/**
 * Model Selection Rules
 * 
 * Defines which model to use for different scenarios.
 */
export const MODEL_SELECTION_RULES = {
    // Portfolio size rules
    portfolioSize: {
        small: { maxHoldings: 10, model: 'groq_llama33' },      // < 10 holdings → Groq
        medium: { maxHoldings: 50, model: 'groq_llama33' },     // 10-50 → Groq
        large: { maxHoldings: Infinity, model: 'openai_gpt4' }  // > 50 → GPT-4 (future)
    },

    // User tier rules
    userTier: {
        free: 'groq_llama33',        // Free tier users → Groq
        pro: 'groq_llama33',         // Pro users → Groq (fast enough)
        enterprise: 'openai_gpt4'    // Enterprise → Best model
    },

    // Task complexity rules
    taskComplexity: {
        simple: 'groq_llama33',      // Chat, quick insights
        medium: 'groq_llama33',      // Portfolio analysis
        complex: 'openai_gpt4'       // Deep financial modeling (future)
    },

    // Default fallback
    default: 'groq_llama33'
};

/**
 * Get model config by strategy
 */
export function getModelConfig(strategy: 'fast' | 'smart' | 'cheap' | 'balanced'): ModelConfig {
    switch (strategy) {
        case 'fast':
        case 'cheap':
        case 'balanced':
            return AI_MODELS.groq_llama33;

        case 'smart':
            // Future: Return GPT-4 or Claude when implemented
            console.warn('[Config] Smart strategy not implemented, using Groq');
            return AI_MODELS.groq_llama33;

        default:
            return AI_MODELS.groq_llama33;
    }
}

/**
 * Get model config for specific task
 */
export function getModelForTask(task: string): ModelConfig {
    // Find first model that supports this use case
    for (const [key, config] of Object.entries(AI_MODELS)) {
        if (config.useCases.includes(task)) {
            // Future: Check if provider is available
            return config;
        }
    }

    // Default to Groq
    return AI_MODELS.groq_llama33;
}

/**
 * Get model based on portfolio size
 */
export function getModelForPortfolio(holdingsCount: number): ModelConfig {
    if (holdingsCount <= 10) {
        return AI_MODELS.groq_llama33;
    } else if (holdingsCount <= 50) {
        return AI_MODELS.groq_llama33;
    } else {
        // Future: Use GPT-4 for large portfolios
        console.warn('[Config] Large portfolio, but GPT-4 not implemented. Using Groq.');
        return AI_MODELS.groq_llama33;
    }
}

/**
 * Calculate estimated cost for a request
 */
export function estimateCost(
    modelKey: string,
    tokensUsed: { prompt: number; completion: number }
): number {
    const config = AI_MODELS[modelKey];
    if (!config) return 0;

    const totalTokens = tokensUsed.prompt + tokensUsed.completion;
    return (totalTokens / 1_000_000) * config.costPer1MTokens;
}
