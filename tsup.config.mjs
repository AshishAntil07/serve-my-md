import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["cli/src/index.ts"],
  external: ["vite"],
  format: ["esm"],
  splitting: false,
  sourcemap: true,
  dts: false,
  clean: true,
  outDir: "bin"
});
