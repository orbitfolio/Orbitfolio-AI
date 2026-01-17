/**
 * Stock Analysis Prompts
 *
 * Centralized prompt templates for single-stock analysis.
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

  const template = `You are a financial analyst AI. Your task is to provide a detailed analysis of a stock based on the provided data.

Analyze the stock for the symbol: {{symbol}}
Here is the financial data:
{{financialData}}

You must respond with valid JSON matching this exact structure: {symbol, orbitScore, breakdown, signal, sentiment, opportunities, risks, generatedAt}.
The JSON output must strictly conform to the following JSON schema.
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
