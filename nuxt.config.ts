import { resolve } from 'path'

export default defineNuxtConfig({
  compatibilityDate: '2025-06-28',
  future: {
    compatibilityVersion: 4,
  },
  devtools: { enabled: true },
  
  // Essential modules for the SOTA platform
  modules: [
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
    '@nuxtjs/color-mode',
    '@nuxt/content'
  ],
  
  // Color mode configuration for dark mode
  colorMode: {
    classSuffix: ''
  },
  
  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/login', '/register', '/confirm', '/password-reset', '/legal/**', '/hfbk/**', '/spark/shared/**']
    },
    clientOptions: {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  },
  
  // CSS configuration
  css: [
    '~/assets/css/main.css', // For Tailwind and custom base styles
  ],
  
  // PostCSS configuration
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
    // Ensure PostCSS only processes CSS files
    config: false,
  },
  
  // App configuration
  app: {
    head: {
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'The next generation of creative tools.' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    },
  },
  
  // TypeScript configuration
  typescript: {
    strict: false,
    typeCheck: false
  },
  
  // Build configuration
  build: {
    transpile: [],
  },
  
  // Additional configuration for Prisma compatibility
  nitro: {
    compressPublicAssets: true,
    minify: true,
    experimental: {
      wasm: true
    },
    externals: {
      external: ['@prisma/client', '.prisma/client']
    }
  },
  
  // Vite configuration for optimization
  vite: {
    build: {
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'vue-router'],
            supabase: ['@supabase/supabase-js']
          }
        },
        external: ['@prisma/client']
      }
    },
    define: {
      global: 'globalThis'
    },
    optimizeDeps: {
      exclude: ['@prisma/client']
    },
    ssr: {
      external: ['@prisma/client']
    }
  },
  
  // Runtime configuration
  runtimeConfig: {
    // Private keys (only available on server-side)
    supabaseServiceKey: '',
    databaseUrl: '',
    
    // Public keys (exposed to client-side)
    public: {
      supabaseUrl: '',
      supabaseAnonKey: '',
      siteUrl: '',
      version: 'commercial'
    }
  },
  
  // SSR configuration
  ssr: true,
  
  // Experimental features for better performance
  experimental: {
    payloadExtraction: false,
    typedPages: true
  }
}) 