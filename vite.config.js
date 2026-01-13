import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Divide las librerías grandes para mejorar la velocidad de carga
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('pdfjs-dist')) return 'vendor-pdfjs';
            if (id.includes('recharts')) return 'vendor-charts';
            return 'vendor'; // Resto de dependencias
          }
        },
      },
    },
  },
  server: {
    port: 3000,
  },
})
