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
  },
  build: {
    outDir: "build",
  },
});
