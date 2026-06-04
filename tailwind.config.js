/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        primary: { DEFAULT: '#5046E4', 50: '#EEF2FF', 100: '#E0E7FF', 500: '#5046E4', 600: '#4338CA', 700: '#3730A3' },
        success: { DEFAULT: '#059669', light: '#D1FAE5' },
        warning: { DEFAULT: '#D97706', light: '#FEF3C7' },
        danger:  { DEFAULT: '#DC2626', light: '#FEE2E2' },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        modal: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
      },
      borderRadius: { xl: '16px', '2xl': '20px', '3xl': '24px' },
    },
  },
  plugins: [],
}
