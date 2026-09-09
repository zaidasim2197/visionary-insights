import { defineNitroConfig } from 'nitro';

export default defineNitroConfig({
  // Detect environment automatically
  presets: process.env.VERCEL ? ['vercel'] : ['cloudflare-module'],
  
  // API routes configuration
  routeRules: {
    // Cache static assets
    '/assets/**': { cache: { maxAge: 60 * 60 * 24 * 365 } },
    // Disable caching for API routes
    '/api/**': { cache: false },
  },

  // TypeScript configuration
  typescript: {
    strict: true,
    tsconfig: {
      compilerOptions: {
        lib: ['dom', 'dom.iterable', 'esnext'],
      },
    },
  },

  // Node compatibility for Vercel
  node: process.env.VERCEL ? true : false,

  // Environment variables
  env: {
    GEMINI_API_KEY: '',
  },

  // Build settings
  minify: true,
});
