import { createContext } from 'react'
import type { RouteTree } from '@shared/index'
import paths from "@/.generated/paths.json" with { type: "json" };

export const pageContext = createContext({
  path: '',
  id: '',
})

export const pathsContext = createContext<Array<RouteTree>>(paths as Array<RouteTree>);
