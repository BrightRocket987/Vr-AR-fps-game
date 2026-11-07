import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

let version = '0.1.0';
try {
  version = '0.1.' + execSync('git rev-list --count HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() + '-' + execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {
  /* not in git */
}

// Served from GitHub Pages at https://<owner>.github.io/Vr-AR-fps-game/
export default defineConfig({
  base: process.env.VITE_BASE ?? '/Vr-AR-fps-game/',
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 1500 },
  server: { host: true, port: 5173 },
});
