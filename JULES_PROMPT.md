Phase 14 - Task 3: Create a dedicated Stock Analysis prompt file.

1. Create a NEW file: `lib/ai/prompts/stock-analysis.ts`.
2. Import `StockAnalysisSchema` from `../schemas.ts`.
3. Implement a function `getStockAnalysisPrompt(symbol, financialData)` that returns a system prompt.
4. Requirements for the prompt:
   - Force strict JSON output using the `StockAnalysisSchema`.
   - Add instruction: "You must respond with valid JSON matching this exact structure: {symbol, orbitScore, breakdown, signal, sentiment, opportunities, risks, generatedAt}".
   - Include the word "JSON" explicitly to satisfy Groq's requirement.
5. Migration: Once the new file is created, update `lib/ai/prompts/portfolio-analysis.ts` to export a deprecated wrapper for `getHoldingAnalysisPrompt` that points to the new logic.

Verify the output parses correctly with Zod after creation.
