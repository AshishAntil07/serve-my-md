import path from "path";
import { defineConfig } from "vitest/config";
import fs from "node:fs";

const env = fs
  .readFileSync(path.resolve(__dirname, ".env.test"), "utf-8")
  .split("\n")
  .reduce(
    (env, line) => {
      const [key, value] = line.split("=");
      if (key && value) {
        env[key.trim()] = value.trim();
      }
      return env;
    },
    {} as Record<string, string>,
  );

console.log("Loaded environment variables:", env);

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 1000,
    sequence: {
      concurrent: false,
    },
    hookTimeout: 25000,
    setupFiles: [path.resolve(__dirname, "tests/pretest.ts")],
    root: path.resolve(__dirname, "."),
    env,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
