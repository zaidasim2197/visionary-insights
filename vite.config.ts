// VisionPulse Vite Configuration
// Configured for React + TanStack Start + Tailwind CSS
// Core plugins managed by vite-tanstack-config

import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Server entry point for SSR rendering
    server: { entry: "server" },
  },
  vite: {
    ssr: {
      external: ['@tanstack/react-router', '@tanstack/react-query'],
    },
    build: {
      rollupOptions: {
        output: {
          format: 'es',
        },
      },
    },
  },
});
