import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          500: '#2b7de9',
          600: '#1d64d8',
          700: '#1a50b0',
          900: '#16305c',
        },
      },
    },
  },
  plugins: [],
}
export default config
