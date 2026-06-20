/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        wa: {
          green: '#25D366',
          'dark-green': '#128C7E',
          'light-green': '#DCF8C6',
          'teal': '#075E54',
          bg: '#ECE5DD',
          panel: '#F0F2F5',
          'chat-bg': '#E5DDD5',
          dark: '#111B21',
          'dark-secondary': '#202C33',
          'dark-panel': '#2A3942',
          'msg-out': '#D9FDD3',
          'msg-in': '#FFFFFF',
          text: '#111B21',
          muted: '#8696A0',
          divider: '#E9EDEF',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      backgroundImage: {
        'chat-pattern': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Ccircle cx='30' cy='30' r='1.5' fill='%23d4c5b0' opacity='0.3'/%3E%3C/svg%3E\")"
      }
    },
  },
  plugins: [],
}
