import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare({
      auxiliaryWorkers: [{ configPath: './wrangler.stats.jsonc' }, { configPath: './guard/wrangler.jsonc' }],
    }),
  ],
  server: { port: 5182, strictPort: true },
  preview: { port: 5182, strictPort: true },
})
