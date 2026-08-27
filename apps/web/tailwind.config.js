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
        },
        eazzio: {
          teal: '#14B8A6',
          tealHover: '#19B8A4',
          tealHighlight: '#5BCDC0',
          tealSoft: '#CCFBF1',
          tealSubtle: '#F0FDFA',
          navy: '#020617',
          navy900: '#0E172A',
          navy800: '#172033',
          canvas: '#F8FAFC',
          surface: '#FFFFFF',
          slate100: '#F1F5F9',
          slate200: '#E2E8F0',
          slate300: '#CBD5E1',
          slate500: '#64748B',
          slate600: '#475569',
          slate700: '#334155',
          textPrimary: '#0F172A',
        },
      },
    },
  },
  plugins: [],
};
