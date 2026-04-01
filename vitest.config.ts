import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web/src")
    }
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["apps/web/src/test/setup.ts"],
    include: ["apps/**/*.test.ts", "apps/**/*.test.tsx", "packages/**/*.test.ts"]
  }
});
