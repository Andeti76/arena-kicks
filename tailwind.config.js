/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Arena Kicks
        kicks: {
          navy:      '#0B2238',
          gold:      '#C99A2E',
          'navy-light': '#173F60',
          'gold-light': '#E2B85A',
          'navy-dark':  '#071827',
          'gold-dark':  '#9C7220',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 18px 50px rgba(11, 34, 56, 0.08)',
        lift: '0 24px 70px rgba(7, 24, 39, 0.16)',
      },
    },
  },
  plugins: [],
}
