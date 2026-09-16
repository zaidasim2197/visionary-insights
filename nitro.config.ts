export default {
  // Preset for Vercel deployment
  preset: 'vercel',
  
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
  node: Boolean(process.env.VERCEL),

  // Environment variables
  env: {
    GEMINI_API_KEY: '',
  },

  // Build settings
  minify: true,
};
