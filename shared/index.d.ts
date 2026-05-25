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
  routes: Route[];
}
export interface Route {
  path: string;
  content: string;
}

export type NestedPair<T> = [T, NestedPair<T>[] | null];
