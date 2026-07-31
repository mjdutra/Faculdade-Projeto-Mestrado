import { defineConfig } from "vite";
// import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({

    base: "/Faculdade-Projeto-Mestrado/",

  server: {
    host: "::",
    port: 8080,
  }, 

  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  optimizeDeps: {
    include: ["three"],
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },

  worker: {
    format: "es",
  },
});