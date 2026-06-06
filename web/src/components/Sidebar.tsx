import { useContext, useMemo } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import type { JSX } from 'react';

import type { Out } from '@shared/index';
import { pathsContext } from '@/contexts';
import {
  Sidebar as Sb,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader
} from '@/components/ui/sidebar';
import outJ from '@/.generated/output.json' with { type: 'json' };
import IntentLink from '@/components/IntentLink';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';

const out = outJ as Out;

export default function Sidebar() {
  const paths = useContext(pathsContext);

  const nestedLinks = useMemo(() => {
    const buildLinks = (
      pairs: typeof paths,
      prefix: string
    ): Array<JSX.Element | null> => {
      return pairs.map(({label, children, isGrouper, pathSegment}, i) => {
        if (prefix !== '/' && !label) return null;

        return children ? isGrouper ? (
            <div key={i} title={label} className="pl-2 mt-2 mb-0.5">
              <span className="text-sm text-muted-foreground pr-2">{label}</span>
              <div className="flex flex-col gap-0 pl-1">
                {buildLinks(children, prefix)}
              </div>
            </div>
          ) : (
          <Collapsible key={i} className="my-0.5">
            <CollapsibleTrigger className="flex justify-between w-full font-body">
              <IntentLink to={prefix + '/' + pathSegment} className="px-2 py-0.5">
                {label || 'Home'}
              </IntentLink>
              <ChevronsUpDown className="w-4 text-muted-foreground" />
            </CollapsibleTrigger>

            <CollapsibleContent style={{ paddingLeft: '0.75em' }}>
              {buildLinks(children, prefix + '/' + pathSegment)}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <IntentLink
            key={i}
            to={prefix + '/' + pathSegment}
            className="block px-2 py-0.5 my-0.5 font-body"
          >
            {label || 'Home'}
          </IntentLink>
        );
      });
    };
    return buildLinks(paths, out.baseRoute || "/");
  }, []);

  return (
    <>
      <Sb variant="inset">
        <SidebarHeader>
          {out.logo && (
            <img src={out.logo} height="24px" alt={`${out.name} logo`} />
          )}
          {(out.showNameWithLogo || !out.logo) && out.name}
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              {nestedLinks}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sb>
    </>
  );
}
