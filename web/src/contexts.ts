import { createContext } from 'react'
import type { NestedPair } from '@shared/index'
import paths from "@/.generated/paths.json" with { type: "json" };

export const pageContext = createContext({
  path: '',
  id: '',
})

export const pathsContext = createContext<Array<NestedPair<string>>>(paths as Array<NestedPair<string>>);
