import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Forward all /api/* requests to Flask at :5000.
      // This keeps cookies same-origin — the browser sees localhost:5173 for everything.
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
      },
      // Proxy the /auth/callback path so Flask's OAuth redirect lands here
      // via the proxy, ensuring the JWT cookie (set by Flask on :5000) is
      // on the same origin as the Vite dev server (localhost:5173).
      // Without this, the cookie domain mismatch causes "Not authenticated".
      '/auth/callback': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
      },
    },
  },
})


