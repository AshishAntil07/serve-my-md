import type { RouteTree, StaticMeta } from "@shared/index";

export interface AppData {
  meta: StaticMeta;
  registry: Record<string, string>;
  routeTree: Array<RouteTree>;
}