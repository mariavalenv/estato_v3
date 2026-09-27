/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        accent: 'var(--accent)',
        success: 'var(--success)',
        warning: 'var(--warning)',
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
        chip: '999px',
      },
      fontSize: {
        display: ['30px', { lineHeight: '1.2', fontWeight: '500' }],
        heading: ['19px', { lineHeight: '1.3', fontWeight: '500' }],
        body: ['15px', { lineHeight: '1.5', fontWeight: '400' }],
        meta: ['12px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      boxShadow: {
        card: '0 4px 16px rgba(0,0,0,0.16)',
      },
    },
  },
  plugins: [],
}
