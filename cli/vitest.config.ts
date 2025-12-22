import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 1000,
    sequence: {
      concurrent: false
    },
    hookTimeout: 25000,
    setupFiles: [path.resolve(__dirname, "tests/pretest.ts")],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }
  }
});
