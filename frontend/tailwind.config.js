/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slack: {
          purple: '#4A154B',
          green: '#2EB67D',
          pink: '#E01E5A',
          blue: '#1264A3',
          orange: '#ECB22E',
          sidebar: '#350D36',
        }
      }
    },
  },
  plugins: [],
}