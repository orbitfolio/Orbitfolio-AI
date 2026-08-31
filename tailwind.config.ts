import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2DD4BF',
        secondary: '#101827',
        orbit: '#070B14',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
export default config
