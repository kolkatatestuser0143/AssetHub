/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/app/**/*.{js,ts,jsx,tsx}', './src/components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: { brand: { 50:'#eff6ff',100:'#dbeafe',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',950:'#172554' } },
      boxShadow: { panel:'0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.04)' },
      borderRadius: { '2.5xl':'1.25rem' }
    }
  },
  plugins: []
};
