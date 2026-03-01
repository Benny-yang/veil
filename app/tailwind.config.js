/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#F2EDE6',
        charcoal: '#1C1A18',
        accent: '#C4A882',
        muted: '#8C8479',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'serif'],
        sans: ['"Noto Sans TC"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

