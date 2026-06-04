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
import type { AppRoute } from '@/types';
import type { RouteTree } from '@shared/index';
import reportWebVitals from '@/reportWebVitals';
import App from '@/App.tsx';
import Rendrer from '@/components/Rendrer';
import { SidebarProvider } from '@/components/ui/sidebar';
import { pathsContext } from '@/contexts';
import Fonts from '@/components/Fonts';
import constants from "@shared/constants.json" with { type: "json" };

const STATIC_TEMP_CONTENT_PREFIX = constants.STATIC_TEMP_CONTENT_PREFIX;

import out from '@/.generated/output.json' with { type: 'json' };
import paths from '@/.generated/paths.json' with { type: 'json' };

const rootRoute = createRootRoute({
  component: () => (
    <>
      <pathsContext.Provider value={paths as Array<RouteTree>}>
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

// Just a safe side in case the code below this one doesn't run;
setTimeout(() => {
  document.body.classList.remove("loading");
}, 10000);

const rootElement = document.getElementById('app');
if (rootElement && (!rootElement.innerHTML || rootElement.innerText.startsWith(STATIC_TEMP_CONTENT_PREFIX))) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );

  document.body.classList.remove("loading");
}


// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
