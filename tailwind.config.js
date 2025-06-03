/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        'none': '0',
        DEFAULT: '0',
      },
      colors: {
        hfbk: {
          // Primary HFBK red
          primary: '#f50000',
          // Background colors
          'bg-dark': '#320300',
          'bg-extra': '#180100',
          // Foreground colors
          'fg-primary': '#FDECE9',
          'fg-secondary': '#F17E71',
          'fg-tertiary': '#F17E71',
          // Text colors
          title: '#F0D9D8',
          subtitle: '#7E7675',
          // Interactive colors
          hover: '#BC4D45',
          focus: '#B63D33',
          // Contrast colors
          'min-contrast': '#A82111',
          'max-contrast': '#FDECE9',
          cutout: '#A82111',
        },
        // Keep some grays for compatibility
        gray: {
          50: '#FDECE9',
          100: '#F0D9D8',
          200: '#E5C4C2',
          300: '#D9AFAC',
          400: '#CE9A96',
          500: '#7E7675',
          600: '#6B5E5D',
          700: '#584645',
          800: '#452E2D',
          900: '#320300',
        },
        // Update red palette to match HFBK
        red: {
          50: '#FDECE9',
          100: '#F0D9D8',
          200: '#F17E71',
          300: '#F17E71',
          400: '#F17E71',
          500: '#f50000',
          600: '#B63D33',
          700: '#A82111',
          800: '#320300',
          900: '#180100',
        }
      },
      fontFamily: {
        'hfbk': ['TimesNewArial', 'sans-serif'],
      }
    },
  },
  plugins: [],
} 