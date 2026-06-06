import type { OpenGraph } from "./og.js";

export interface SmmConfig {
  rootTitle?: string;
  description?: string;
  markdownItOptions?: Record<string, any>;
  baseRoute?: string;
  outDir?: string;
  publicPath?: string;
  defaultTheme?: string;
  favicon?: string;
  logo?: string;
  name?: string;
  showNameWithLogo?: boolean;
  og?: OpenGraph;
  sortRoutes?: boolean;
  trimIndexFromPath?: boolean;
  version?: string;
  fonts?: {
    title?: {
      name: string;
      url?: string;
    };
    body?: {
      name: string;
      url?: string;
    };
    mono?: {
      name: string;
      url?: string;
    };
  };
}

export interface Args {
  directory: string;
  skipBuild?: boolean;
  interactive: boolean;
}

export type IgnoreRule = {
  pattern: string;
  negated: boolean;
};
