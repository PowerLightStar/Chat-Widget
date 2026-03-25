/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#41372c',
          50: '#f7f6f4',
          100: '#e9e6e2',
          200: '#d4cfc7',
          300: '#b9b1a5',
          400: '#9c9182',
          500: '#7f7262',
          600: '#655a4d',
          700: '#53493e',
          800: '#453d34',
          900: '#41372c',
          950: '#241e18',
        },
      },
    },
  },
  plugins: [],
}
