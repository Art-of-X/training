import { resolve } from 'path'

export default defineNuxtConfig({
  compatibilityDate: '2025-06-28',
  devtools: { enabled: true },
  
  // Essential modules for the SOTA platform
  modules: [
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
    '@nuxtjs/color-mode'
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
      exclude: ['/', '/login', '/register', '/confirm', '/password-reset']
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
  
  // App configuration
  app: {
    head: {
      titleTemplate: 'Artificial Artistic Thinking',
      title: 'AAT Platform',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { key: 'description', name: 'description', content: 'Secure AI Training Platform for capturing artists\' creative DNA' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    },
  },
  
  // TypeScript configuration
  typescript: {
    strict: true,
    typeCheck: true
  },
  
  // Build configuration
  build: {
    transpile: ['@prisma/client'],
  },
  
  // Additional configuration for Prisma compatibility
  nitro: {
    compressPublicAssets: true,
    minify: true,
    experimental: {
      wasm: true
    },
    externals: {
      inline: ['@prisma/client']
    },
    alias: {
      '.prisma/client/index-browser': './node_modules/.prisma/client/index-browser.js',
      '.prisma/client/default': './node_modules/.prisma/client/default.js',
      '.prisma/client': './node_modules/.prisma/client/index.js',
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
        }
      }
    },
    define: {
      global: 'globalThis'
    },
    optimizeDeps: {
      exclude: ['@prisma/client']
    },
    resolve: {
      alias: {
        '.prisma/client/index-browser': './node_modules/.prisma/client/index-browser.js',
        '.prisma/client/default': './node_modules/.prisma/client/default.js',
        '.prisma/client': './node_modules/.prisma/client/index.js',
      },
    },
  },
  
  // Runtime configuration
  runtimeConfig: {
    // Private keys (only available on server-side)
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    databaseUrl: process.env.DATABASE_URL,
    
    // Public keys (exposed to client-side)
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
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