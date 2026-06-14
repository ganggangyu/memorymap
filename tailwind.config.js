/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'title': ['Caveat', 'Ma Shan Zheng', 'cursive'],
        'handwriting': ['Caveat', 'Ma Shan Zheng', 'cursive'],
        'serif-sc': ['Noto Serif SC', 'ZCOOL XiaoWei', 'serif'],
      },
      colors: {
        ink: {
          900: '#2c1810',
          800: '#3c2415',
          700: '#4a3728',
          600: '#5c4a3a',
          400: '#8b7355',
          300: '#a89070',
        },
        sage: { 600: '#4a6741', 500: '#5c7a6a', 400: '#7a9a7a', 100: '#e8f0e3', 50: '#f4f8f0' },
        seal: { 600: '#8b2500', 500: '#a0522d', 400: '#c67b5c', 100: '#fdf0e8', 50: '#fef7f2' },
        gold: { 400: '#c4a97d', 300: '#d4c4a0', 200: '#e0d5b8', 100: '#f0e8d5', 50: '#faf5e8' },
        paper: { bg: '#fef9f0', surface: '#fffdf7', cream: '#faf3e3', dark: '#f5ebd8' },
      },
      animation: {
        'page-enter': 'pageEnter 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
        'fadeIn': 'fadeIn 0.5s ease-out forwards',
      },
    },
  },
  plugins: [],
}
