import { useContext, useMemo } from 'react';
import type { JSX } from 'react';

import type { Out } from '@/types';
import { pathsContext } from '@/contexts';
import {
  Sidebar as Sb,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader
} from '@/components/ui/sidebar';
import outJ from '@/output.json' with { type: 'json' };
import IntentLink from '@/components/IntentLink';

const out = outJ as Out;

export default function Sidebar() {
  const paths = useContext(pathsContext);

  const nestedLinks = useMemo(() => {
    const buildLinks = (
      pairs: typeof paths,
      prefix: string
    ): Array<JSX.Element | null> => {
      return pairs.map(([name, children]) => {
        if(prefix !== "/" && !name) return null;

        return (
          <div key={name}>
            <IntentLink to={prefix + '/' + name}>{name || "Home -tbc"}</IntentLink>
            {children && (
              <div style={{ paddingLeft: '1em' }}>
                {buildLinks(children, prefix + '/' + name)}
              </div>
            )}
          </div>
        );
      });
    };
    return buildLinks(paths, '/');
  }, []);

  return (
    <>
      <Sb variant="inset">
        <SidebarHeader>
          {out.logo && <img src={out.logo} alt={`${out.name} logo`} />}
          {out.logo && out.showNameWithLogo && out.name}
        </SidebarHeader>
        <SidebarGroup title="Navigatable Links Group">
          <SidebarGroupLabel>LINKS</SidebarGroupLabel>
          <SidebarGroupContent>{nestedLinks}</SidebarGroupContent>
        </SidebarGroup>
      </Sb>
    </>
  );
}
