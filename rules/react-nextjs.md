# React & Next.js Standards

## Component Architecture
- **Server Components by Default**: Use React Server Components unless client interactivity is needed.
- **Client Components**: Add `'use client'` only when using hooks, event handlers, or browser APIs.
- **File Structure**: 
  - `page.tsx` for route pages
  - `components/` for reusable UI
  - `lib/` for utilities and business logic

## State Management
- Prefer server-side data fetching over client-side state
- Use `useState` for local UI state only
- Use `useReducer` for complex state logic
- Avoid prop drilling > 2 levels; use Context or composition

## Styling
- Use Vanilla CSS with CSS variables for theming
- No TailwindCSS unless explicitly requested by user
- Follow mobile-first responsive design
- Use CSS Grid for layouts, Flexbox for alignment

## Performance
- Use `React.memo` sparingly and only when measured
- Lazy load heavy components with `dynamic()`
- Optimize images with `next/image`
- Avoid inline functions in render when possible

## Accessibility
- All interactive elements must be keyboard accessible
- Use semantic HTML (`button`, `nav`, `main`, `section`)
- Include `aria-label` for icon-only buttons
- Ensure sufficient color contrast (WCAG 2.1 AA)
