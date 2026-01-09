import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import { resolve, dirname } from 'path'

function copyClientCss(): Plugin {
  return {
    name: 'veslx-copy-client-css',
    writeBundle() {
      const sourcePath = resolve(__dirname, 'src/index.css')
      const destPath = resolve(__dirname, 'dist/client/src/index.css')
      fs.mkdirSync(dirname(destPath), { recursive: true })
      fs.copyFileSync(sourcePath, destPath)
    },
  }
}

// Library build config - pre-compiles src/ components for distribution
// CSS is left to runtime processing (Tailwind needs to scan for classes)
export default defineConfig({
  plugins: [
    react(),
    copyClientCss(),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.tsx'),
      formats: ['es'],
      fileName: 'main'
    },
    rollupOptions: {
      // Externalize all deps - they're resolved at runtime
      external: (id) => {
        // Virtual modules
        if (id === 'virtual:content-modules') return true
        // CSS files (processed at runtime by Tailwind)
        if (id.endsWith('.css')) return true
        // All node_modules
        if (id.includes('node_modules')) return true
        // Bare imports (dependencies)
        if (!id.startsWith('.') && !id.startsWith('/') && !id.startsWith('@/')) return true
        return false
      },
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      }
    },
    outDir: 'dist/client',
    emptyOutDir: true,
    // Don't minify for better debugging
    minify: false,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
