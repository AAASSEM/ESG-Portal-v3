/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      },
      colors: {
        'brand-green': '#10B981',
        'text-high': '#F9FAFB',
        'text-muted': '#9CA3AF'
      }
    },
  },
  plugins: [],
}