import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Mantiene il prefisso REACT_APP_ per le variabili d'ambiente (invece del default VITE_ di Vite),
// cosi' i vari .env* esistenti non vanno rinominati.
export default defineConfig({
  plugins: [react()],
  envPrefix: "REACT_APP_",
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      // FE locale + BE online: inoltra le chiamate /api al backend di produzione,
      // evitando problemi di CORS (il browser vede tutto come same-origin su localhost).
      "/api": {
        target: "https://api.photoandvision.it",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    outDir: "build",
  },
});
