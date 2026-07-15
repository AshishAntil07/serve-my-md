import type MarkdownIt from "markdown-it";
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

export interface CommandState {
  command: string;
  handler: () => Promise<void>;
  options: any;
}

export interface UtilState {
  finalConfig: SmmConfig;
  mdParser: MarkdownIt;
  shouldIgnore: (targetPath: string) => boolean;
}

export type SharedState = CommandState & UtilState;

export type RouteState = {
  routes: string[];
}

export type Writer = (filePath: string, content: string, contentType: string) => Promise<void>;

export type VirtualFileEntry = {
  content: Buffer | string | (() => VirtualFileEntry);
  contentType: string;
};
export type VirtualFileRegistry = Map<string, VirtualFileEntry>;


export interface BuildArgs {
  directory: string;
  interactive: boolean;
}

export interface DevArgs {
  port: string;
  directory: string;
}

export type IgnoreRule = {
  pattern: string;
  negated: boolean;
};
