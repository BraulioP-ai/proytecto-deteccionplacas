import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true  // Esto fuerza el puerto 5173 o falla si está ocupado
  }
})