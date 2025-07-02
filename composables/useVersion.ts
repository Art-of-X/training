export const useVersion = () => {
  const config = useRuntimeConfig()
  
  // Get version from runtime config with fallback
  const version = computed(() => {
    const configVersion = config.public.version as string
    return ['commercial', 'research'].includes(configVersion) ? configVersion : 'commercial'
  })
  
  // Helper functions
  const isCommercial = computed(() => version.value === 'commercial')
  const isResearch = computed(() => version.value === 'research')
  
  // Version-specific configuration
  const versionConfig = computed(() => {
    if (version.value === 'research') {
      return {
        fontFamily: 'Helvetica, Arial, sans-serif',
        primaryColor: 'rgb(245, 0, 0)',
        policyType: 'research',
        theme: 'minimal',
        footerLinks: [
          { text: 'Imprint', to: 'https://hfbk-hamburg.de/en/hochschule/impressum/', external: true },
          { text: 'Data Policy', to: 'https://hfbk-hamburg.de/en/hochschule/datenschutzerkl%C3%A4rung/', external: true },
          { text: 'Research Information', to: '/legal/research-information', external: false }
        ],
        colors: {
          // Primary colors - all red variations
          primary: {
            50: 'rgb(255, 255, 255)',   // white for light backgrounds
            100: 'rgb(255, 255, 255)',  // white for light backgrounds
            200: 'rgb(245, 0, 0)',      // main red
            300: 'rgb(245, 0, 0)',      // main red
            400: 'rgb(245, 0, 0)',      // main red
            500: 'rgb(245, 0, 0)',      // main red
            600: 'rgb(245, 0, 0)',      // main red
            700: 'rgb(200, 0, 0)',      // darker red for hover
            800: 'rgb(180, 0, 0)',      // darker red
            900: 'rgb(0, 0, 0)',        // black for dark backgrounds
          },
          // Secondary colors - pure black/white/grey
          secondary: {
            50: 'rgb(255, 255, 255)',   // white
            100: 'rgb(255, 255, 255)',  // white
            200: 'rgb(0, 0, 0)',        // black for borders
            300: 'rgb(255, 255, 255)',  // white
            400: 'rgb(128, 128, 128)',  // grey
            500: 'rgb(128, 128, 128)',  // grey
            600: 'rgb(0, 0, 0)',        // black
            700: 'rgb(0, 0, 0)',        // black
            800: 'rgb(26, 26, 26)',     // dark grey (no blue tint)
            900: 'rgb(0, 0, 0)',        // black
          },
          // Force all other color scales to research colors
          blue: {
            50: 'rgb(255, 255, 255)',
            100: 'rgb(255, 255, 255)',
            200: 'rgb(245, 0, 0)',
            300: 'rgb(245, 0, 0)',
            400: 'rgb(245, 0, 0)',
            500: 'rgb(245, 0, 0)',
            600: 'rgb(245, 0, 0)',
            700: 'rgb(200, 0, 0)',
            800: 'rgb(180, 0, 0)',
            900: 'rgb(0, 0, 0)',
          },
          // Error/success colors - also use research palette
          error: {
            50: 'rgb(255, 255, 255)',
            100: 'rgb(255, 255, 255)',
            500: 'rgb(245, 0, 0)',
            600: 'rgb(245, 0, 0)',
            700: 'rgb(200, 0, 0)',
          },
          success: {
            50: 'rgb(255, 255, 255)',
            100: 'rgb(255, 255, 255)',
            500: 'rgb(245, 0, 0)',
            600: 'rgb(245, 0, 0)',
            700: 'rgb(200, 0, 0)',
          },
          warning: {
            50: 'rgb(255, 255, 255)',
            100: 'rgb(255, 255, 255)',
            500: 'rgb(245, 0, 0)',
            600: 'rgb(245, 0, 0)',
            700: 'rgb(200, 0, 0)',
          }
        }
      }
    }
    
    return {
      fontFamily: 'Px Grotesk, sans-serif',
      primaryColor: '#3b82f6', // blue
      policyType: 'commercial',
      theme: 'standard',
      footerLinks: [
        { text: 'Imprint', to: '/imprint', external: false },
        { text: 'Data Policy', to: '/policy-commercial', external: false },
        { text: 'Terms of Service', to: '/terms', external: false }
      ],
      colors: {
        // Standard Tailwind color palette for commercial
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
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
        }
      }
    }
  })
  
  return {
    version: readonly(version),
    isCommercial: readonly(isCommercial),
    isResearch: readonly(isResearch),
    versionConfig: readonly(versionConfig)
  }
} 