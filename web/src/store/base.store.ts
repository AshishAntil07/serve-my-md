import type { AppData } from '@/types';
import type { Route } from '@shared/index';
import { create } from 'zustand/react';

interface BaseStoreReducers {
  setMeta: (meta: AppData['meta']) => void;
  setRegistry: (registry: AppData['registry']) => void;
  setRouteTree: (routeTree: AppData['routeTree']) => void;
  setAppData: (appData: AppData) => void;
  setCurrentRoute: (currentRoute: Route) => void;
  clearAppData: () => void;
  clearCurrentRoute: () => void;
};

export const useBaseStore = create<Partial<AppData & {currentRoute: Route}> & BaseStoreReducers>((set) => ({
  setMeta: (meta: AppData['meta']) => set((state) => ({ ...state, meta })),
  setRegistry: (registry: AppData['registry']) => set((state) => ({ ...state, registry })),
  setRouteTree: (routeTree: AppData['routeTree']) => set((state) => ({ ...state, routeTree })),
  setAppData: (appData: AppData) => set((state) => ({ ...state, ...appData })),
  setCurrentRoute: (currentRoute: Route) => set((state) => ({ ...state, currentRoute })),
  clearAppData: () => set(() => ({ meta: undefined, registry: undefined, routeTree: undefined, currentRoute: undefined })),
  clearCurrentRoute: () => set((state) => ({ ...state, currentRoute: undefined })),
}));
