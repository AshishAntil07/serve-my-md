import React from 'react';
import { HomeIcon } from 'lucide-react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator
} from './ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from './ui/dropdown-menu';
import IntentLink from './IntentLink';

const MAX_CRUMBS = 3;

export default function Bettercrumb({ path }: { path: string }) {
  const pathPieces = path.split('/').filter(Boolean);

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink to={'/'} className="px-2 py-1.5">
              <HomeIcon className="w-4" />
            </BreadcrumbLink>
          </BreadcrumbItem>
          {0 < pathPieces.length && <BreadcrumbSeparator />}

          {pathPieces.length > MAX_CRUMBS && (
            <React.Fragment>
              <BreadcrumbItem>
                <DropdownMenu>
                  <DropdownMenuTrigger className="px-2 py-1.5 hover:text-foreground">
                    ...
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {pathPieces
                      .slice(0, pathPieces.length - MAX_CRUMBS)
                      .map((piece, index) => (
                        <DropdownMenuItem key={index} asChild>
                          <IntentLink
                            to={'/' + pathPieces.slice(0, index + 1).join('/')}
                            className="px-2 py-1.5"
                          >
                            {piece}
                          </IntentLink>
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </React.Fragment>
          )}

          {pathPieces
            .slice(Math.max(pathPieces.length - MAX_CRUMBS, 0))
            .map((piece, index, arr) => (
              <React.Fragment key={index}>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    to={
                      '/' +
                      pathPieces
                        .slice(0, pathPieces.length - arr.length + index + 1)
                        .join('/')
                    }
                    className="px-2 py-1.5"
                  >
                    {piece}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {index < arr.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
}
