import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import '@/styles.css';
import type { AppRoute } from '@/types/index.ts';
import type { NestedPair } from '@shared/index';
import reportWebVitals from '@/reportWebVitals.ts';
import App from '@/App.tsx';
import Rendrer from '@/components/Rendrer.tsx';
import { SidebarProvider } from '@/components/ui/sidebar.tsx';
import { pathsContext } from '@/contexts';
import Fonts from '@/components/Fonts.tsx';

import out from '@/.generated/output.json' with { type: 'json' };
import paths from '@/.generated/paths.json' with { type: 'json' };

const rootRoute = createRootRoute({
  component: () => (
    <>
      <pathsContext.Provider value={paths as Array<NestedPair<string>>}>
        <SidebarProvider>
          <App>
            <Outlet />
            <Fonts />
          </App>
        </SidebarProvider>
      </pathsContext.Provider>
      <TanStackRouterDevtools />
    </>
  )
});

const routes: Array<AppRoute> = [];

out.routes.forEach((route, i) => {
  const newRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: route.path || '/',
    component: () => (
      <Rendrer
        path={route.path}
        content={route.content}
        title={''}
        next={out.routes[i + 1]?.path}
        prev={out.routes[i - 1]?.path}
      />
    )
  });
  routes.push(newRoute);
});

const routeTree = rootRoute.addChildren(routes);

const router = createRouter({
  routeTree,
  context: {},
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('app');
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
