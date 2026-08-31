import Groq from 'groq-sdk';
import { BaseLLM, LLMMessage, LLMResponse, LLMConfig } from './base-llm';

/**
 * Groq LLM Client
 * 
 * Fast, cost-effective LLM provider using Llama 3.3 70B
 * Free tier: 14,000 requests/day
 * Best for: Real-time analysis, chat, quick insights
 */
export class GroqClient extends BaseLLM {
    private client: Groq;
    private readonly COST_PER_1M_TOKENS = 0.59; // $0.59 per 1M tokens (prompt + completion)

    constructor(config: LLMConfig = { model: 'llama-3.3-70b-versatile' }) {
        const apiKey = process.env.GROQ_API_KEY || '';

        if (!apiKey) {
            console.warn('[GroqClient] GROQ_API_KEY not set - client will fail at runtime');
        }

        super(config, apiKey);
        this.client = new Groq({ apiKey });
    }

    async complete(
        messages: LLMMessage[],
        runtimeConfig?: Partial<LLMConfig>
    ): Promise<LLMResponse> {
        const startTime = Date.now();

        try {
            // Ensure the word "json" exists in the messages list to satisfy Groq's JSON-mode validation
            const hasJsonKeyword = messages.some(
                (msg) => msg.content && msg.content.toLowerCase().includes('json')
            );
            const finalMessages = hasJsonKeyword
                ? messages
                : [
                      { role: 'system', content: 'You must respond with valid JSON.' },
                      ...messages,
                  ];

            const response = await this.client.chat.completions.create({
                model: runtimeConfig?.model || this.config.model,
                messages: finalMessages as any,
                temperature: runtimeConfig?.temperature ?? this.config.temperature ?? 0.7,
                max_tokens: runtimeConfig?.maxTokens ?? this.config.maxTokens ?? 8000,
                top_p: runtimeConfig?.topP ?? this.config.topP ?? 1,
                stop: runtimeConfig?.stopSequences ?? this.config.stopSequences,
                response_format: { type: 'json_object' },
            });

            const latencyMs = Date.now() - startTime;

            return {
                content: response.choices[0]?.message?.content || '',
                model: response.model,
                tokensUsed: {
                    prompt: response.usage?.prompt_tokens || 0,
                    completion: response.usage?.completion_tokens || 0,
                    total: response.usage?.total_tokens || 0,
                },
                finishReason: (response.choices[0]?.finish_reason as any) || 'stop',
                provider: 'groq',
                latencyMs,
            };
        } catch (error: any) {
            console.error('[GroqClient] Completion failed:', error);

            return {
                content: '',
                model: this.config.model,
                tokensUsed: { prompt: 0, completion: 0, total: 0 },
                finishReason: 'error',
                provider: 'groq',
                latencyMs: Date.now() - startTime,
            };
        }
    }

    getProviderName(): string {
        return 'groq';
    }

    estimateCost(tokensUsed: { prompt: number; completion: number }): number {
        const totalTokens = tokensUsed.prompt + tokensUsed.completion;
        return (totalTokens / 1_000_000) * this.COST_PER_1M_TOKENS;
    }

    async isAvailable(): Promise<boolean> {
        if (!this.apiKey) return false;

        try {
            // Simple health check with minimal token usage
            await this.simpleComplete('ping', undefined, { maxTokens: 1 });
            return true;
        } catch {
            return false;
        }
    }
}
