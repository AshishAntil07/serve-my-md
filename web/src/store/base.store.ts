import type { AppData } from '@/types';
import type { Route } from '@shared/index';
import { create } from 'zustand/react';

interface BaseStoreReducers {
  setMeta: (meta: AppData['meta']) => void;
  setRegistry: (registry: AppData['registry']) => void;
  setRouteTree: (routeTree: AppData['routeTree']) => void;
  setAppData: (appData: AppData) => void;
  setCurrentRoute: (currentRoute: Route) => void;
  set404: () => void;
  clearAppData: () => void;
  clearCurrentRoute: () => void;
}

export const useBaseStore = create<
  Partial<AppData & { currentRoute: Route; is404: boolean }> & BaseStoreReducers
>((set) => ({
  setMeta: (meta: AppData['meta']) => set((state) => ({ ...state, meta })),
  setRegistry: (registry: AppData['registry']) =>
    set((state) => ({ ...state, registry })),
  setRouteTree: (routeTree: AppData['routeTree']) =>
    set((state) => ({ ...state, routeTree })),
  setAppData: (appData: AppData) => set((state) => ({ ...state, ...appData })),
  setCurrentRoute: (currentRoute: Route) =>
    set((state) => ({ ...state, currentRoute, is404: false })),
  set404: (is404: boolean = true) =>
    set(() => ({
      is404
    })),
  clearAppData: () =>
    set(() => ({
      meta: undefined,
      registry: undefined,
      routeTree: undefined,
      currentRoute: undefined
    })),
  clearCurrentRoute: () =>
    set((state) => ({ ...state, currentRoute: undefined }))
}));
