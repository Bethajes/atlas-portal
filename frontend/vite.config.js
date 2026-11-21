import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Polling avoids "ENOSPC: System limit for number of file watchers reached"
    // on Linux machines with a low inotify limit. Set VITE_USE_POLLING=false
    // after raising fs.inotify.max_user_watches to use native events again.
    watch: {
      usePolling: process.env.VITE_USE_POLLING !== 'false',
      interval: 500,
      ignored: ['**/node_modules/**', '**/dist/**', '**/uploads/**', '**/.git/**'],
    },
  },
})
