import type { AppData } from '@/types';
import type { Route } from '@shared/index';
import path from 'path-browserify';

export default class Api {
  private static pageDataUrl = new URL('../page_data', import.meta.url);
  private static lockedApis: Set<string> = new Set();

  static async fetchRoute(routeIdentifier: string): Promise<Route | null> {
    return this.retryWrapper<Route>(
      path.join(
        this.pageDataUrl.toString(),
        'routes',
        routeIdentifier + '.json'
      ),
      async (res, resolve, reject) => {
        if (res.ok) return resolve(res.json());
        reject(new Error('Failed to fetch route'));
      }
    );
  }

  static async fetchMeta(): Promise<AppData['meta'] | null> {
    return this.retryWrapper<AppData['meta']>(
      path.join(this.pageDataUrl.toString(), 'meta.json'),
      async (res, resolve, reject) => {
        if (res.ok) return resolve(res.json());
        reject(new Error('Failed to fetch meta'));
      }
    );
  }

  static async fetchRegistry(): Promise<AppData['registry'] | null> {
    return this.retryWrapper<AppData['registry']>(
      path.join(this.pageDataUrl.toString(), 'registry.json'),
      async (res, resolve, reject) => {
        if (res.ok) return resolve(res.json());
        reject(new Error('Failed to fetch registry'));
      }
    );
  }

  static async fetchRouteTree(): Promise<AppData['routeTree'] | null> {
    return this.retryWrapper<AppData['routeTree']>(
      path.join(this.pageDataUrl.toString(), 'paths.json'),
      async (res, resolve, reject) => {
        if (res.ok) return resolve(res.json());
        reject(new Error('Failed to fetch route tree'));
      }
    );
  }

  private static async retryWrapper<T>(
    endpoint: string,
    fn: (
      response: Response,
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void
    ) => Promise<void>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T | null> {
    if (this.lockedApis.has(endpoint)) {
      return null;
    }

    this.lockedApis.add(endpoint);

    const result = await new Promise<T>((resolve, reject) => {
      const attempt = (n: number) => {
        fetch(endpoint)
          .then((response) => fn(response, resolve, reject))
          .catch((err) =>
            n ? setTimeout(() => attempt(n - 1), delay) : reject(err)
          );
      };
      attempt(retries);
    });

    this.lockedApis.delete(endpoint);

    return result;
  }
}
