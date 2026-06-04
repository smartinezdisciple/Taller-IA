/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'fondo-base': '#0F1117',
        'fondo-sidebar': '#161B27',
        'fondo-tarjeta': '#1E2433',
        'acento': '#F97316',
        'acento-hover': '#EA6C0A',
        'acento-suave': '#FED7AA',
        'texto-principal': '#F1F5F9',
        'texto-secundario': '#94A3B8',
        'texto-datos': '#1E293B',
        'exito': '#22C55E',
        'advertencia': '#EAB308',
        'error': '#EF4444',
        'info': '#3B82F6',
        'borde': '#2D3748',
        'borde-acento': '#F97316',
      },
      fontFamily: {
        'rajdhani': ['Rajdhani', 'sans-serif'],
        'ibm-plex': ['"IBM Plex Sans"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
