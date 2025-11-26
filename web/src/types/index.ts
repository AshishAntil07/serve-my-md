import type { AnyContext, Register, ResolveParams, RootRoute, Route as rt } from "@tanstack/react-router";

export type AppRoute = rt<unknown, RootRoute<Register, undefined, {}, AnyContext, AnyContext, {}, undefined, unknown, unknown, unknown, unknown, undefined>, string, "/", string, "__root__", undefined, ResolveParams<string>, AnyContext, AnyContext, AnyContext, {}, undefined, unknown, unknown, unknown, unknown, undefined>;



// must be in sync with cli
export interface Out {
  rootTitle: string;
  description: string;
  baseRoute: string;
  defaultTheme: string;
  favicon?: string;
  logo?: string;
  name: string;
  showNameWithLogo: boolean;
  routes: Array<Route>;
}
export interface Route {
  path: string;
  content: string;
}

export type NestedPair<T> = [T, Array<NestedPair<T>> | null];