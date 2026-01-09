import { BaseLLM } from './base-llm';
import { GroqClient } from './groq-client';

/**
 * Model Selection Strategy
 */
export type ModelStrategy = 'fast' | 'smart' | 'cheap' | 'balanced';

/**
 * Model Factory
 * 
 * Central point for LLM provider selection.
 * Benefits:
 * - Switch providers in one place
 * - A/B test different models
 * - Automatic fallback on failure
 * - Cost optimization
 */
export class ModelFactory {
    private static groqClient: GroqClient | null = null;
    // Future: Add OpenAI, Claude, etc.
    // private static openaiClient: OpenAIClient | null = null;
    // private static claudeClient: ClaudeClient | null = null;

    /**
     * Get LLM client based on strategy
     * @param strategy - Selection strategy ('fast', 'smart', 'cheap', 'balanced')
     * @returns LLM client instance
     */
    static getModel(strategy: ModelStrategy = 'balanced'): BaseLLM {
        switch (strategy) {
            case 'fast':
                // Groq: Ultra-fast inference (< 500ms typical)
                return this.getGroqClient();

            case 'cheap':
                // Groq free tier: 14K requests/day
                return this.getGroqClient();

            case 'balanced':
                // Default: Groq (good balance of speed and quality)
                return this.getGroqClient();

            case 'smart':
                // Future: Use GPT-4 or Claude for complex reasoning
                // For now, fallback to Groq
                console.warn('[ModelFactory] Smart strategy not implemented, using Groq');
                return this.getGroqClient();

            default:
                return this.getGroqClient();
        }
    }

    /**
     * Get model for specific use case
     */
    static getModelForTask(task: 'chat' | 'analysis' | 'classification' | 'generation'): BaseLLM {
        switch (task) {
            case 'chat':
                // Fast responses crucial for chat
                return this.getModel('fast');

            case 'analysis':
                // Portfolio analysis - balanced approach
                return this.getModel('balanced');

            case 'classification':
                // Simple classification - cheap and fast
                return this.getModel('cheap');

            case 'generation':
                // Content generation - quality matters
                return this.getModel('balanced');

            default:
                return this.getModel('balanced');
        }
    }

    /**
     * Get Groq client (singleton)
     */
    private static getGroqClient(): GroqClient {
        if (!this.groqClient) {
            this.groqClient = new GroqClient({
                model: 'llama-3.3-70b-versatile',
                temperature: 0.7,
                maxTokens: 8000,
            });
        }
        return this.groqClient;
    }

    /**
     * Reset all clients (useful for testing)
     */
    static reset(): void {
        this.groqClient = null;
    }

    /**
     * Get all available providers
     */
    static async getAvailableProviders(): Promise<string[]> {
        const providers: string[] = [];

        try {
            const groq = this.getGroqClient();
            if (await groq.isAvailable()) {
                providers.push('groq');
            }
        } catch {
            // Groq not available
        }

        // Future: Check OpenAI, Claude, etc.

        return providers;
    }
}

/**
 * Convenience function for quick completions
 * @param prompt - User prompt
 * @param strategy - Model selection strategy
 * @returns Completion text
 */
export async function quickComplete(
    prompt: string,
    strategy: ModelStrategy = 'balanced'
): Promise<string> {
    const model = ModelFactory.getModel(strategy);
    const response = await model.simpleComplete(prompt);
    return response.content;
}

/**
 * Convenience function for task-specific completions
 * @param prompt - User prompt
 * @param task - Task type
 * @returns Completion text
 */
export async function taskComplete(
    prompt: string,
    task: 'chat' | 'analysis' | 'classification' | 'generation'
): Promise<string> {
    const model = ModelFactory.getModelForTask(task);
    const response = await model.simpleComplete(prompt);
    return response.content;
}
