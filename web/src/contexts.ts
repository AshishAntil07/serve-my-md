import { createContext } from 'react'
import type { NestedPair } from '@/types'
import paths from "@/paths.json" with { type: "json" };

export const pageContext = createContext({
  path: '',
  id: '',
})

export const pathsContext = createContext<Array<NestedPair<string>>>(paths as Array<NestedPair<string>>);
