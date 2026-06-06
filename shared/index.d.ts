export interface Out {
  rootTitle: string;
  description: string;
  baseRoute: string;
  defaultTheme: string;
  favicon?: string;
  logo?: string;
  name: string;
  version?: string;
  fonts?: {
    title: string;
    body: string;
    mono: string;
  };
  showNameWithLogo: boolean;
  outDir: string;
  routes: Route[];
}
export interface Route {
  path: string;
  content: string;
}

export type RouteTree = {
  label: string;
  children: RouteTree[] | null;
  pathSegment: string;
  isGrouper?: boolean;
};

/**
 * A unique prefix for static content in the HTML template, used to replace temp content with react components.
 */
export const STATIC_TEMP_CONTENT_PREFIX = "__smm_static_temp_content__";