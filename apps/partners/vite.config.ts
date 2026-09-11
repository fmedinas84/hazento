import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Shared source lives outside this app. Resolve React from Partners itself,
  // including on isolated Vercel installs with no root node_modules.
  resolve: { dedupe: ['react', 'react-dom'] },
})
