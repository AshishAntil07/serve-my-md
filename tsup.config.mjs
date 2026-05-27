import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["cli/src/index.ts"],
  external: ["vite"],
  format: ["esm"],
  splitting: false,
  sourcemap: false,
  dts: false,
  clean: true,
  outDir: "bin",
  banner: {
    js: '#!/usr/bin/env node'
  }
});
