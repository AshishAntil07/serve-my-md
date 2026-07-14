export interface StaticMeta {
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
}
export interface Route {
  path: string;
  content: string;
  identifier: string;
  next?: string;
  prev?: string;
}

export type SearchIndex = SearchIndexPage[];
export interface SearchIndexPage {
  route: string;
  title: string;
  sections: SearchIndexPageSection[];
}
export interface SearchIndexPageSection {
  title: string;
  anchor: string;
  preview: string;
  keywords: string[];
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