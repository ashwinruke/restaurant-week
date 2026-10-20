/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" lets the built site work from any sub-path (e.g. GitHub Pages /restaurant-week/).
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { chunkSizeWarningLimit: 800 },
  // The Notebook page reads ../bandits/notebooks/regret_analysis.ipynb, which sits outside this folder.
  server: { fs: { allow: [".."] } },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
