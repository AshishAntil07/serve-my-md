import { routesCacheContext } from '@/contexts';
import Api from '@/lib/api';
import { useBaseStore } from '@/store/base.store';
import { useLocation } from '@tanstack/react-router';
import { useContext, useEffect } from 'react';

export default function usePopulator() {
  const pathname = useLocation({
    select(state) {
      return state.pathname;
    }
  });
  const routesCache = useContext(routesCacheContext);
  const store = useBaseStore();

  useEffect(() => {
    if (!store.meta)
      Api.fetchMeta().then((meta) => {
        if(!meta) return;

        store.setMeta(meta);
      });

    if (!store.registry)
      Api.fetchRegistry().then((registry) => {
        if(!registry) return;

        store.setRegistry(registry);
      });

    if (!store.routeTree)
      Api.fetchRouteTree().then((routeTree) => {
        if(!routeTree) return;

        store.setRouteTree(routeTree);
      });

    if (!routesCache.has(pathname) && store.registry) {
      Api.fetchRoute(store.registry[pathname]).then((route) => {
        if(!route) return;

        routesCache.set(pathname, route);
        store.setCurrentRoute(route);
      });
    }
  }, [pathname, routesCache, store]);
}
