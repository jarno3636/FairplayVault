import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: { brand: { DEFAULT: '#0B0F13', accent: '#22D3EE', soft: '#0F172A' } },
      boxShadow: { soft: '0 10px 30px rgba(0,0,0,.2)' }
    },
  },
  plugins: [],
}
export default config
