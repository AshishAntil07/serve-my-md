import type { Route } from "@shared/index";

export default class RoutesCache {
  private cache: Map<Route['path'], Route> = new Map();
  private routes: Array<Route['path']> = [];
  private static maxSize: number = 5;

  public get(path: Route['path']): Route | undefined {
    return this.cache.get(path);
  }

  public set(path: Route['path'], route: Route): void {
    if (this.cache.size >= RoutesCache.maxSize) {
      const oldestPath = this.routes.shift();
      if (oldestPath) this.cache.delete(oldestPath);
    }
    this.cache.set(path, route);
    this.routes.push(path);
  }

  public has(path: Route['path']): boolean {
    return this.cache.has(path);
  }

  public clear(): void {
    this.cache.clear();
    this.routes = [];
  }
}