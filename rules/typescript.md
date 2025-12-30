# TypeScript Coding Standards

## General Rules
- **Strict Mode**: Enable `strict: true` in tsconfig.json
- **No `any`**: Avoid `any` type. Use `unknown` with type guards or explicit interfaces.
- **Explicit Return Types**: All exported functions must have explicit return types.
- **Null Safety**: Use optional chaining (`?.`) and nullish coalescing (`??`).

## Naming Conventions
- **Variables/Functions**: camelCase (e.g., `calculateScore`, `fetchData`)
- **Types/Interfaces**: PascalCase (e.g., `StockDataInput`, `MacroRegimeResult`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`, `API_BASE_URL`)
- **Files**: kebab-case (e.g., `orbitfolio-score.ts`, `macro-regime.ts`)

## Error Handling
- Always use try-catch for async operations
- Log errors with context: `console.error('[Module] Error:', error.message)`
- Provide fallback values for non-critical failures
- Never swallow errors silently

## Imports
- Use absolute imports via `@/` alias
- Group imports: (1) External packages, (2) Internal modules, (3) Types
- No circular dependencies

## Code Organization
- One component/function per file when possible
- Keep files under 300 lines; refactor into smaller modules
- Co-locate tests with source files or in `__tests__/` folder
