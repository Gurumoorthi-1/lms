/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0a0a5c', light: '#1a1a8c', dark: '#06063d' },
        accent:  { DEFAULT: '#ff5722', light: '#ff7043' },
        bg:      { DEFAULT: '#f8f9fa' },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
