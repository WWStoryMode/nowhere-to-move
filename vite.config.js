import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Everything is inlined into one dist/index.html so the page opens offline
// straight from the filesystem - no server, no network, no runtime fetch.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist',
    // Nothing is preloaded once every module is inlined, so the polyfill is dead
    // code - dropping it means the bundle contains no fetch() call at all.
    modulePreload: { polyfill: false },
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    reportCompressedSize: false,
  },
})
