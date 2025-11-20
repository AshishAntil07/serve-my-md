import type { OpenGraph } from "./og.js";

export interface SmmConfig {
  rootTitle?: string;
  description?: string;
  markdownItOptions?: Record<string, any>;
  baseRoute?: string;
  publicPath?: string;
  defaultTheme?: string;
  favicon?: string;
  logo?: string;
  name?: string;
  showNameWithLogo?: boolean;
  og?: OpenGraph;
}

export interface Out {
  rootTitle: string;
  description: string;
  baseRoute: string;
  defaultTheme: string;
  favicon?: string;
  name: string;
  showNameWithLogo: boolean;
  routes: Route[];
}
export interface Route {
  path: string;
  content: string;
}

export type NestedPair<T> = [T, NestedPair<T>[] | null];

export type IgnoreRule = {
  pattern: string;
  negated: boolean;
};
