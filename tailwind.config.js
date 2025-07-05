/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  darkMode: 'class',
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./nuxt.config.{js,ts}",
    "./app.vue"
  ],
  theme: {
    extend: {
      // Custom color palette for the AI training platform
      colors: {
        primary: {
          50: 'hsl(var(--color-primary-50) / <alpha-value>)',
          100: 'hsl(var(--color-primary-100) / <alpha-value>)',
          200: 'hsl(var(--color-primary-200) / <alpha-value>)',
          300: 'hsl(var(--color-primary-300) / <alpha-value>)',
          400: 'hsl(var(--color-primary-400) / <alpha-value>)',
          500: 'hsl(var(--color-primary-500) / <alpha-value>)',
          600: 'hsl(var(--color-primary-600) / <alpha-value>)',
          700: 'hsl(var(--color-primary-700) / <alpha-value>)',
          800: 'hsl(var(--color-primary-800) / <alpha-value>)',
          900: 'hsl(var(--color-primary-900) / <alpha-value>)',
          950: 'hsl(var(--color-primary-950) / <alpha-value>)',
        },
        secondary: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d'
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309'
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c'
        },
        background: 'hsl(var(--color-background) / <alpha-value>)'
      },
      
      // Sharp corners - NO rounded corners
      borderRadius: {
        'none': '0',
        DEFAULT: '0',
        'sm': '0',
        'md': '0',
        'lg': '0',
        'xl': '0',
        '2xl': '0',
        '3xl': '0',
        'full': '0'
      },
      
      // Custom spacing for the minimalist design
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },
      
      // Typography enhancements
      fontFamily: {
        sans: ['"Px Grotesk"', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace']
      },
      
      // Animation for smooth interactions
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    },
  },
  plugins: [
    // Add form plugin for better form styling
    require('@tailwindcss/forms')({
      strategy: 'class' // Use class-based strategy for better control
    }),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
} 