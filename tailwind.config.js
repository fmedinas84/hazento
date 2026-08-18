/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        ink: '#17211c',
        canvas: '#f2f4f1',
        brand: '#6254e7',
        mint: '#dff5e8'
      },
      boxShadow: { card: '0 1px 2px rgba(20,31,25,.04), 0 12px 32px rgba(20,31,25,.035)' }
    }
  },
  plugins: []
}
