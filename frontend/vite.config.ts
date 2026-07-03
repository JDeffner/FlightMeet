import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // In Produktion läuft die App unter https://team11.wi1cm.uni-trier.de/public/.
  // Im Dev-Server (vite serve) bleibt sie unter / erreichbar.
  const base = command === 'build' ? '/public/' : '/'

  // Backend-Adresse für den Dev-Proxy; per CI_BACKEND_URL (z. B. in .env.local)
  // überschreibbar, falls Port 8080 belegt ist.
  const env = loadEnv(mode, __dirname, '')
  const backend = env.CI_BACKEND_URL ?? 'http://localhost:8080'

  return {
    base,
    plugins: [
      react(),
      tailwindcss(), // falls Tailwind genutzt wird
    ],
    // Build direkt in das CodeIgniter public/-Verzeichnis, ohne index.php zu löschen.
    build: {
      outDir: '../public',
      emptyOutDir: false,
    },
    server: {
      proxy: {
        '/api': backend,
        '/media': backend,
      },
    },
    resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    },
  }
})
