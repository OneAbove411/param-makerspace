/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brutal: {
          paper: '#E8E4DD',
          red: '#C4291E',
          bg: '#F5F3EE',
          dark: '#111111',
        }
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        drama: ['"DM Serif Display"', 'serif'],
        data: ['"Space Mono"', 'monospace'],
      },
      borderRadius: {
        '2xl': '2rem',
        '3xl': '3rem',
      },
      scale: {
        '103': '1.03',
      },
      transitionTimingFunction: {
        'magnetic': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeInScale: {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in-up-d1': 'fadeInUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both',
        'fade-in-up-d2': 'fadeInUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both',
        'fade-in-up-d3': 'fadeInUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both',
      },
    },
  },
  plugins: [
    require('@tailwindcss/container-queries'),
  ],
}
