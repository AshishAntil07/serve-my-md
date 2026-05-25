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
  SidebarGroupLabel,
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
      return pairs.map(([name, children]) => {
        if (prefix !== '/' && !name) return null;
        if (name.startsWith('(') && name.endsWith(')')) {
          const groupName = name.slice(1, -1);
          return (
            <div key={groupName} title={groupName} className="px-2 mt-2">
              <span className="text-sm text-muted-foreground">{groupName}</span>
              <div className="flex flex-col gap-2 px-1">
                {buildLinks(children!, prefix)}
              </div>
            </div>
          );
        }

        return children ? (
          <Collapsible key={name} className="">
            <CollapsibleTrigger className="flex justify-between w-full font-body">
              <IntentLink to={prefix + '/' + name} className="px-2 py-0.5">
                {name || 'Home'}
              </IntentLink>
              <ChevronsUpDown className="w-4 text-muted-foreground" />
            </CollapsibleTrigger>

            <CollapsibleContent style={{ paddingLeft: '0.75em' }}>
              {buildLinks(children, prefix + '/' + name)}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <IntentLink
            to={prefix + '/' + name}
            className="block px-2 py-0.5 font-body"
          >
            {name || 'Home'}
          </IntentLink>
        );
      });
    };
    return buildLinks(paths, '/');
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
