import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["cli/src/index.ts"],
  format: ["esm"],
  external: ["ws", "mime-types"],
  splitting: false,
  sourcemap: false,
  platform: "node",
  target: "node22",
  dts: false,
  clean: true,
  outDir: "bin",
  banner: {
    js: '#!/usr/bin/env node'
  }
});
