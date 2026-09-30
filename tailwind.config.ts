import type { Config } from 'tailwindcss'

/**
 * Semantic color tokens. Values live as RGB triplets in app/styles/globals.css
 * (:root / .dark) so utilities support alpha: bg-card, text-ink-muted,
 * border-line/[0.08], bg-accent/10, ... The legacy primary/secondary/orbit
 * palette is gone — it had no remaining usages.
 */
const rgb = (channels: string) => `rgb(var(--c-${channels}) / <alpha-value>)`

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        base: rgb('base'),
        card: rgb('card'),
        sunken: rgb('sunken'),
        line: rgb('line'),
        ink: {
          DEFAULT: rgb('ink'),
          soft: rgb('ink-soft'),
          secondary: rgb('ink-secondary'),
          muted: rgb('ink-muted'),
          faint: rgb('ink-faint'),
        },
        accent: {
          DEFAULT: rgb('accent'),
          ink: rgb('accent-ink'),
          bright: rgb('accent-bright'),
        },
        positive: rgb('positive'),
        warning: rgb('warning'),
        negative: rgb('negative'),
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
export default config
