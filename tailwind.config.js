import colors from 'tailwindcss/colors';
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F1F6F2',
          100: '#DCE9E0',
          200: '#BAD3C2',
          300: '#8FB79D',
          400: '#5F9373',
          500: '#3E7554',
          600: '#2D5F42',
          700: '#1F4A33',
          800: '#173928',
          900: '#0F2419'
        },
        tierra: {
          50: '#FDF7ED',
          100: '#F8E9CE',
          300: '#E4B563',
          500: '#C67C1E',
          600: '#A8630F',
          700: '#7F4A0C'
        },
        neutral: colors.stone,
        sano: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
        tratamiento: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
        cuarentena: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
        vacunado: { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
        observacion: { bg: '#EDE9FE', text: '#5B21B6', border: '#DDD6FE' }
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      fontSize: { xs: ['13px', { lineHeight: '1.5' }] },
      boxShadow: { card: '0 1px 2px rgba(28,25,23,.06)' }
    }
  },
  plugins: []
};
