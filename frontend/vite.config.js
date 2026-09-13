import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Em desenvolvimento, as chamadas /api vão para o backend.
      // Assim o frontend e o backend ficam na mesma origem (mais seguro).
      '/api': 'http://localhost:3000',
    },
  },
})
