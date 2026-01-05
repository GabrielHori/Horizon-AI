import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), 
  ],

  server: {
    port: 5174,
    strictPort: true,
    
    // ✅ CORRECTION: Empêcher Vite de surveiller les fichiers de données
    // Cela évite les page reload quand les fichiers JSON changent
    watch: {
      // Ignorer complètement le dossier data/ et ses sous-dossiers
      ignored: [
        '**/data/**',
        '**/logs/**',
        '**/build/**',
        '**/dist/**',
        '**/*.json',  // Ignorer tous les JSON (sauf package.json qui est géré différemment)
        '!**/package.json',
        '!**/tsconfig.json',
        '!**/vite.config.js',
      ],
    },
    
    // ✅ Désactiver le HMR full reload pour les fichiers non-code
    hmr: {
      overlay: true,
    },
  },

  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // ✅ Optimiser les dépendances pour éviter les rebuilds inutiles
  optimizeDeps: {
    exclude: [],
    include: ['react', 'react-dom', 'lucide-react', 'react-markdown'],
  },

  build: {
    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      external: [] 
    }
  }
})
