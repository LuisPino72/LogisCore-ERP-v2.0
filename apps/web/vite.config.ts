import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@/lib/supabase": path.resolve(__dirname, "apps/web/src/lib/supabaseClient")
    }
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom")) return "vendor-react";
            if (id.includes("@supabase/supabase-js")) return "vendor-supabase";
            if (id.includes("dexie")) return "vendor-dexie";
            if (id.includes("zustand")) return "vendor-zustand";
            return undefined;
          }
          return undefined;
        }
      }
    },
    chunkSizeWarningLimit: 600,
    minify: 'esbuild',
  }
});
