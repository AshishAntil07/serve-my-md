import { createContext } from 'react'
import type { RouteTree } from '@shared/index'
import RoutesCache from './lib/routesCache';

export const pageContext = createContext({
  path: '',
  id: '',
})

export const pathsContext = createContext<Array<RouteTree>>([] as Array<RouteTree>);
export const routesCacheContext = createContext<RoutesCache>(new RoutesCache());