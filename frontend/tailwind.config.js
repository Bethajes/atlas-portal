/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        brand: {
          50: '#FDECEC',
          100: '#FAD3D3',
          200: '#F4A7A7',
          300: '#EA8080',
          400: '#E05D5D',
          500: '#C62828',
          600: '#B71C1C',
          700: '#9C1B1B',
          800: '#8E1A1A',
          900: '#7C1A1A',
          950: '#4A0F0F',
        },
        accent: {
          50: '#FDECEC',
          100: '#FAD3D3',
          200: '#F4A7A7',
          300: '#EA8080',
          400: '#E05D5D',
          500: '#C62828',
          600: '#B71C1C',
          700: '#9C1B1B',
          800: '#8E1A1A',
          900: '#7C1A1A',
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        panel: '0 8px 30px rgba(15, 23, 42, 0.06)',
      },
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}
