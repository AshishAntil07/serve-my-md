import { useMemo } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import type { JSX } from 'react';

import {
  Sidebar as Sb,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader
} from '@/components/ui/sidebar';
import IntentLink from '@/components/IntentLink';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { useBaseStore } from '@/store/base.store';
import type { RouteTree } from '@shared/index';
import { Skeleton } from './ui/skeleton';

export default function Sidebar() {
  const store = useBaseStore();
  const paths = store.routeTree;

  return (
    <>
      {paths && store.meta ? (
        <SidebarComponent
          logo={store.meta.logo}
          siteName={store.meta.name}
          showNameWithLogo={store.meta.showNameWithLogo}
          baseRoute={store.meta.baseRoute}
          paths={paths}
          loading={false}
        />
      ) : (
        <SidebarComponent loading={true} />
      )}
    </>
  );
}

function SidebarComponent({
  logo,
  siteName,
  showNameWithLogo,
  baseRoute,
  paths,
  loading
}:
  | {
      logo?: string;
      siteName: string;
      showNameWithLogo: boolean;
      baseRoute: string;
      paths: Array<RouteTree>;
      loading: false;
    }
  | {
      logo?: undefined;
      siteName?: undefined;
      showNameWithLogo?: undefined;
      baseRoute?: undefined;
      paths?: undefined;
      loading: true;
    }) {
  const nestedLinks = useMemo(() => {
    const buildLinks = (
      pairs: typeof paths,
      prefix: string
    ): Array<JSX.Element | null> => {
      return !loading
        ? pairs!.map(({ label, children, isGrouper, pathSegment }, i) => {
            if (prefix !== '/' && !label) return null;

            return children ? (
              isGrouper ? (
                <SidebarGrouper key={i} label={label}>
                  {buildLinks(children, prefix)}
                </SidebarGrouper>
              ) : (
                <SidebarCollapsible
                  key={i}
                  label={label}
                  href={prefix + '/' + pathSegment}
                >
                  {buildLinks(children, prefix + '/' + pathSegment)}
                </SidebarCollapsible>
              )
            ) : (
              <SidebarLink
                key={i}
                href={prefix + '/' + pathSegment}
                label={label}
              />
            );
          })
        : [
            <>
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-1/4 mb-2" />
              <Skeleton className="h-4 w-1/3 mb-2" />
              <Skeleton className="h-4 w-1/5 mb-2" />
              <Skeleton className="h-4 w-1/6 mb-4" />
              <Skeleton className="h-2.5 w-5/7 mb-2" />
              <Skeleton className="h-4 w-5/8 mb-2" />
              <Skeleton className="h-4 w-9/10 mb-2" />
            </>
          ];
    };
    return buildLinks(paths, baseRoute || '/');
  }, [loading, paths, baseRoute]);

  return (
    <>
      <Sb variant="inset">
        <SidebarHeader>
          {loading ? (
            <Skeleton className="h-6 w-6" />
          ) : (
            logo && <img src={logo} height="24px" alt={`${siteName} logo`} />
          )}
          {loading ? (
            <Skeleton className="h-4 w-3/4" />
          ) : (
            (showNameWithLogo || !logo) && siteName
          )}
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>{nestedLinks}</SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sb>
    </>
  );
}

function SidebarGrouper({
  label,
  children
}: {
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div title={label} className="pl-2 mt-2 mb-0.5">
      <span className="text-sm text-muted-foreground pr-2">{label}</span>
      <div className="flex flex-col gap-0 pl-1">{children}</div>
    </div>
  );
}

function SidebarCollapsible({
  label,
  href,
  children
}: {
  label?: string;
  href: string;
  children?: React.ReactNode;
}) {
  return (
    <Collapsible className="my-0.5">
      <CollapsibleTrigger className="flex justify-between w-full font-body">
        <IntentLink to={href} className="px-2 py-0.5">
          {label || 'Home'}
        </IntentLink>
        <ChevronsUpDown className="w-4 text-muted-foreground" />
      </CollapsibleTrigger>

      <CollapsibleContent style={{ paddingLeft: '0.75em' }}>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function SidebarLink({ href, label }: { href: string; label?: string }) {
  return (
    <IntentLink to={href} className="block px-2 py-0.5 my-0.5 font-body">
      {label || 'Home'}
    </IntentLink>
  );
}
