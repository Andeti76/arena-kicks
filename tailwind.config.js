/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Arena Kicks
        kicks: {
          navy:      '#1a3a5c',  // azul marinho principal
          gold:      '#c9922a',  // dourado principal
          'navy-light': '#2a5080',
          'gold-light': '#e8b84b',
          'navy-dark':  '#0f2338',
          'gold-dark':  '#a07020',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
