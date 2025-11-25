/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Open Sans - Dashboard overall UI, Data tables, Patient lists
        'open-sans': ['Open Sans', 'sans-serif'],
        // Roboto - Numbers, statistics, graphs, Headers, Button labels
        'roboto': ['Roboto', 'sans-serif'],
        // Lato - Interface elements (forms, filters, menus), Chart labels, Section descriptions
        'lato': ['Lato', 'sans-serif'],
        // Montserrat - Section titles, Headers, Highlighted KPIs
        'montserrat': ['Montserrat', 'sans-serif'],
        // Helvetica - Main content areas, Widget labels, Detailed patient information
        'helvetica': ['Helvetica', 'Arial', 'sans-serif'],
        // Arial - Reports, Sidebar menus, General UI text
        'arial': ['Arial', 'Helvetica', 'sans-serif'],
        // Source Sans Pro - Subheadings, Help text/tooltips, Notifications
        'source-sans': ['Source Sans Pro', 'sans-serif'],
        // Raleway - Supporting text, Alerts and banners, Summary boxes
        'raleway': ['Raleway', 'sans-serif'],
        // Merriweather - Explanatory paragraphs, Notes/descriptions, Supporting text
        'merriweather': ['Merriweather', 'serif'],
      },
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
    },
  },
  plugins: [],
}

