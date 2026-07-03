import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // In Produktion läuft die App unter https://team11.wi1cm.uni-trier.de/public/.
  // Im Dev-Server (vite serve) bleibt sie unter / erreichbar.
  const base = command === 'build' ? '/public/' : '/'

  // Backend-Adresse für den Dev-Proxy. Überschreibbar per Umgebungsvariable
  // oder .env.local (VITE_API_TARGET=http://localhost:8082), z.B. wenn 8080
  // schon von einem anderen Projekt belegt ist.
  const env = loadEnv(mode, __dirname, '')
  const apiTarget = process.env.VITE_API_TARGET ?? env.VITE_API_TARGET ?? 'http://localhost:8080'

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
      // PORT wird z.B. von Tooling gesetzt; Standard bleibt 5173.
      port: Number(process.env.PORT) || 5173,
      proxy: {
        '/api': apiTarget,
        '/media': apiTarget,
      },
    },
    resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    },
  }
})
