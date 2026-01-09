/**
 * Base LLM Interface
 * 
 * This interface defines the contract that all LLM providers must implement.
 * Benefits:
 * - Swap LLM providers without changing application code
 * - Test with mock implementations
 * - Add new providers easily
 * - Type-safe LLM interactions
 */

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LLMResponse {
    content: string;
    model: string;
    tokensUsed: {
        prompt: number;
        completion: number;
        total: number;
    };
    finishReason: 'stop' | 'length' | 'content_filter' | 'error';
    provider: string;
    latencyMs: number;
}

export interface LLMConfig {
    model: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    stopSequences?: string[];
}

/**
 * Base interface for all LLM providers
 */
export abstract class BaseLLM {
    protected config: LLMConfig;
    protected apiKey: string;

    constructor(config: LLMConfig, apiKey: string) {
        this.config = config;
        this.apiKey = apiKey;
    }

    /**
     * Generate a completion from messages
     * @param messages - Array of conversation messages
     * @param config - Optional runtime config overrides
     * @returns LLM response with metadata
     */
    abstract complete(
        messages: LLMMessage[],
        config?: Partial<LLMConfig>
    ): Promise<LLMResponse>;

    /**
     * Generate a simple completion from a single prompt
     * @param prompt - Single prompt string
     * @param systemPrompt - Optional system instruction
     * @param config - Optional runtime config overrides
     * @returns LLM response with metadata
     */
    async simpleComplete(
        prompt: string,
        systemPrompt?: string,
        config?: Partial<LLMConfig>
    ): Promise<LLMResponse> {
        const messages: LLMMessage[] = [];

        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }

        messages.push({ role: 'user', content: prompt });

        return this.complete(messages, config);
    }

    /**
     * Get provider name
     */
    abstract getProviderName(): string;

    /**
     * Calculate estimated cost for a request
     * @param tokensUsed - Token usage from response
     * @returns Cost in USD
     */
    abstract estimateCost(tokensUsed: { prompt: number; completion: number }): number;

    /**
     * Check if provider is available (API key set, rate limits not hit)
     */
    abstract isAvailable(): Promise<boolean>;
}
