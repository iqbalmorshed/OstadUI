import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,       // or '0.0.0.0' to allow any IP
    port: 5173,
  },
  preview: {
    allowedHosts: ['ostadui-1.onrender.com'], // ✅ allow this host
    host: true,
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        'src/main.jsx',
        '**/*.config.{js,ts}',
        'src/test/**',
      ],
    },
  },
})
