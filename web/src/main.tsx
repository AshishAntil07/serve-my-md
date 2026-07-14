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
import type { RouteTree } from '@shared/index';
import reportWebVitals from '@/reportWebVitals';
import App from '@/App.tsx';
import Handler from '@/components/Rendrer';
import { SidebarProvider } from '@/components/ui/sidebar';
import { pathsContext, routesCacheContext } from '@/contexts';
import Fonts from '@/components/Fonts';
import constants from '@shared/constants.json' with { type: 'json' };
import RoutesCache from './lib/routesCache';
import usePopulator from './hooks/useRoutes';

const STATIC_TEMP_CONTENT_PREFIX = constants.STATIC_TEMP_CONTENT_PREFIX;

const rootRoute = createRootRoute({
  component: () => {
    usePopulator();

    return (
    <>
      <routesCacheContext.Provider value={new RoutesCache()}>
        <pathsContext.Provider value={[] as Array<RouteTree>}>
          <SidebarProvider>
            <App>
              <Outlet />
              <Fonts />
            </App>
          </SidebarProvider>
        </pathsContext.Provider>
      </routesCacheContext.Provider>
      <TanStackRouterDevtools />
    </>
  )}
});

// const routes: Array<AppRoute> = [];

// out.routes.forEach((route, i) => {
// });

// make a context wth a defned tpe that works and stores all necessary data
//
// also make a component that puts the whole of page into loadng of some kind or that
// provdes nfo that the data s currently loading so that the page can put skeletons
// wherever needed. skeletons would be better in my opnon.
//
// also make sure the component accepts a functoni chlld that takes arguments
// for that data
//
// maybe a hook to populate all of the data would be very helpful. central control
// over all of stuff. and several other hooks for loadinig the data that's of nterest
// for a sngle page.

export const docsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$',
  component: () => (
    <Handler />
  )
});
// routes.push(docsRoute);

const routeTree = rootRoute.addChildren([docsRoute]);

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
  document.body.classList.remove('loading');
}, 10000);

const rootElement = document.getElementById('app');
if (
  rootElement &&
  (!rootElement.innerHTML ||
    rootElement.innerText.startsWith(STATIC_TEMP_CONTENT_PREFIX))
) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );

  document.body.classList.remove('loading');
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
