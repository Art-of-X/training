export default defineNuxtPlugin(() => {
  const { version, versionConfig } = useVersion()

  // Apply styling based on version
  if (process.client) {
    const applyVersionStyling = () => {
      const html = document.documentElement
      const body = document.body

      if (version.value === 'research') {
        // Add research version classes
        html.classList.add('version-research')
        body.classList.add('version-research')
        
        // Force light mode in research version
        html.classList.remove('dark')
        body.classList.remove('dark')
        
        // Override color mode to prevent dark mode
        const colorMode = useColorMode()
        if (colorMode) {
          colorMode.preference = 'light'
        }

        // Apply research-specific styles (LIGHT MODE ONLY)
        const style = document.createElement('style')
        style.textContent = `
          .version-research {
            font-family: 'Helvetica', 'Arial', sans-serif !important;
            
            /* Override CSS custom properties for primary colors */
            --primary-50: 255 255 255;
            --primary-100: 255 255 255;
            --primary-200: 245 0 0;
            --primary-300: 245 0 0;
            --primary-400: 245 0 0;
            --primary-500: 245 0 0;
            --primary-600: 245 0 0;
            --primary-700: 200 0 0;
            --primary-800: 180 0 0;
            --primary-900: 0 0 0;
          }
          
          .version-research body {
            font-family: 'Helvetica', 'Arial', sans-serif !important;
            background-color: white !important;
            color: black !important;
          }
          
          .version-research * {
            font-family: 'Helvetica', 'Arial', sans-serif !important;
          }
          
          /* Override ALL primary/blue colors to red */
          .version-research .bg-primary-50,
          .version-research .bg-primary-100,
          .version-research .bg-primary-200,
          .version-research .bg-primary-300,
          .version-research .bg-primary-400,
          .version-research .bg-primary-500,
          .version-research .bg-primary-600,
          .version-research .bg-primary-700,
          .version-research .bg-primary-800,
          .version-research .bg-primary-900,
          .version-research .btn-primary {
            background-color: rgb(245, 0, 0) !important;
            color: white !important;
          }
          
          .version-research .text-primary-50,
          .version-research .text-primary-100,
          .version-research .text-primary-200,
          .version-research .text-primary-300,
          .version-research .text-primary-400,
          .version-research .text-primary-500,
          .version-research .text-primary-600,
          .version-research .text-primary-700,
          .version-research .text-primary-800,
          .version-research .text-primary-900 {
            color: rgb(245, 0, 0) !important;
          }
          
          .version-research .border-primary-50,
          .version-research .border-primary-100,
          .version-research .border-primary-200,
          .version-research .border-primary-300,
          .version-research .border-primary-400,
          .version-research .border-primary-500,
          .version-research .border-primary-600,
          .version-research .border-primary-700,
          .version-research .border-primary-800,
          .version-research .border-primary-900 {
            border-color: rgb(245, 0, 0) !important;
          }
          
          /* Progress bar */
          .version-research .bg-primary-600,
          .version-research .bg-primary-500 {
            background-color: rgb(245, 0, 0) !important;
          }
          
          /* Light primary backgrounds to white */
          .version-research .bg-primary-50,
          .version-research .bg-primary-100 {
            background-color: white !important;
            color: rgb(245, 0, 0) !important;
          }
          
          /* Success/error/warning colors to red */
          .version-research .bg-success-100,
          .version-research .bg-success-50,
          .version-research .text-success-600,
          .version-research .text-success-700 {
            background-color: white !important;
            color: rgb(245, 0, 0) !important;
          }
          
          .version-research .border-success-200,
          .version-research .border-success-500 {
            border-color: rgb(245, 0, 0) !important;
          }
          
          /* Hover states */
          .version-research .hover\\:bg-primary-700:hover,
          .version-research .hover\\:bg-primary-600:hover {
            background-color: rgb(200, 0, 0) !important;
          }
          
          .version-research .hover\\:text-primary-700:hover,
          .version-research .hover\\:text-primary-600:hover {
            color: rgb(200, 0, 0) !important;
          }
          
          /* Focus rings */
          .version-research .ring-primary-500,
          .version-research .focus\\:ring-primary-500:focus {
            --tw-ring-color: rgb(245 0 0) !important;
          }
          
          /* Rainbow text override */
          .version-research .rainbow-text {
            background: rgb(245, 0, 0) !important;
            background-clip: text !important;
            -webkit-background-clip: text !important;
            -webkit-text-fill-color: transparent !important;
            animation: none !important;
          }
          
          /* Light mode backgrounds - clean black and white */
          .version-research .bg-secondary-50,
          .version-research .bg-secondary-100 {
            background-color: white !important;
          }
          
          .version-research .bg-secondary-200 {
            background-color: rgb(230, 230, 230) !important;
          }
          
          /* Text colors */
          .version-research .text-secondary-600,
          .version-research .text-secondary-700,
          .version-research .text-secondary-800,
          .version-research .text-secondary-900 {
            color: black !important;
          }
          
          /* Borders */
          .version-research .border-secondary-200,
          .version-research .border-secondary-300 {
            border-color: black !important;
          }
        `
        document.head.appendChild(style)
      } else {
        // Commercial version (default)
        html.classList.add('version-commercial')
        body.classList.add('version-commercial')
      }
    }

    // Apply on mount
    onMounted(applyVersionStyling)
    
    // Also apply immediately if DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyVersionStyling)
    } else {
      applyVersionStyling()
    }
  }
}) 