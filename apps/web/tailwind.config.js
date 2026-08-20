/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#2D5BFF',
          hover: '#244ACC',
          accent: '#FFA43D',
        },
        surface: {
          light: '#FFFFFF',
          lightMuted: '#F4F5F7',
          dark: '#0F1115',
          darkMuted: '#16181D',
          darkElevated: '#1C1F26',
        },
        border: {
          light: '#E2E4E9',
          dark: '#2A2E37',
        }
      }
    },
  },
  plugins: [],
}
