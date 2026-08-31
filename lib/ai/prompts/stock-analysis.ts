/**
 * Stock Analysis Prompts
 *
 * Centralized prompt templates for single-stock analysis.
 * Research labels stay Robust…Fragile. Client action Buy/Hold/Sell may be
 * mentioned only if it matches the payload.
 */

import { StockAnalysisSchema } from '../schemas';
import { fillTemplate, zodSchemaToPrompt } from './utils';

/**
 * Generates a system prompt for a detailed stock analysis.
 *
 * @param symbol The stock symbol to analyze (e.g., "AAPL").
 * @param financialData A string containing relevant financial data (e.g., from an API).
 * @returns A system prompt string for the AI model.
 */
export function getStockAnalysisPrompt(symbol: string, financialData: string): string {
  const schemaStructure = zodSchemaToPrompt(StockAnalysisSchema);

  const template = `You are a research assistant for Orbitfolio.
Research labels must stay descriptive: Robust, Constructive, Mixed, Cautious, Fragile — never use those slots for Buy/Sell.
Client action is derived from the Orbit score. You may mention Buy, Hold, or Sell only if it matches the computed action in the payload. Do not invent trim or accumulate. Do not invent a different action.

Write a 2-sentence rationale for {{symbol}} using the numbers below. Do not invent metrics.
Return JSON only: {"rationale":"..."}.

Financial / pillar data:
{{financialData}}

Reference schema (guidance label is research quality; action is the client Buy/Hold/Sell):
\`\`\`json
{{schemaStructure}}
\`\`\`
`;

  return fillTemplate(template, {
    symbol,
    financialData,
    schemaStructure,
  });
}
