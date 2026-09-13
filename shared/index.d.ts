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