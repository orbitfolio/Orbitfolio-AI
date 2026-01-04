import { z } from 'zod';

// Portfolio validation
export const PortfolioSchema = z.object({
    name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
    userId: z.string().uuid().optional(),
});

// Holding validation
export const HoldingSchema = z.object({
    portfolio_id: z.string().uuid('Invalid portfolio ID'),
    symbol: z.string().min(1, 'Symbol is required').transform(s => s.toUpperCase()),
    type: z.enum(['STOCK', 'MUTUAL_FUND', 'EQUITY', 'BOND', 'CRYPTO']),
    quantity: z.number().positive('Quantity must be positive'),
    average_price: z.number().nonnegative('Price cannot be negative'),
    currency: z.string().length(3).optional().default('USD'),
});

// Search query validation
export const SearchQuerySchema = z.object({
    q: z.string().min(1, 'Query too short').max(100),
    limit: z.number().int().min(1).max(50).optional().default(10),
});

export type PortfolioInput = z.infer<typeof PortfolioSchema>;
export type HoldingInput = z.infer<typeof HoldingSchema>;
