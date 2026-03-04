import { useContext, useMemo } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import type { JSX } from 'react';

import type { Out } from '@shared/index';
import { pathsContext } from '@/contexts';
import {
  Sidebar as Sb,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from '@/components/ui/sidebar';
import outJ from '@/.generated/output.json' with { type: 'json' };
import IntentLink from '@/components/IntentLink';
import ThemeSwitch from '@/components/ThemeSwitcher';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import Search from '@/components/Search';

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

        return children ? (
          <Collapsible key={name} className=''>
            <CollapsibleTrigger className='flex justify-between w-full font-body'>
              <IntentLink to={prefix + '/' + name} className='px-2 py-0.5'>{name || "Home -tbc"}</IntentLink>
              <ChevronsUpDown className='w-4 text-muted-foreground' />
            </CollapsibleTrigger>
            
            <CollapsibleContent style={{ paddingLeft: '1em' }}>
              {buildLinks(children, prefix + '/' + name)}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <div key={name}>
            <IntentLink to={prefix + '/' + name} className='block px-2 py-0.5 font-body'>
              {name || "Home -tbc"}
            </IntentLink>
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
        <SidebarGroup>
          <SidebarGroupContent className='flex gap-2'>
            <ThemeSwitch />
            <Search />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup title="Navigatable Links Group">
          <SidebarGroupLabel>LINKS</SidebarGroupLabel>
          <SidebarGroupContent>{nestedLinks}</SidebarGroupContent>
        </SidebarGroup>
      </Sb>
    </>
  );
}
