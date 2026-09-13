import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

import Bettercrumb from './Bettercrumb';
import { Button } from './ui/button';
import IntentLink from './IntentLink';
import { Kbd } from './ui/kbd';
import { SidebarTrigger } from './ui/sidebar';
import { useIsMobile } from '@/hooks/useMobile';
import Search from './Search';
import ThemeSwitch from './ThemeSwitcher';
import { useBaseStore } from '@/store/base.store';
import { Skeleton } from './ui/skeleton';
import { HomeIcon } from 'lucide-react';

export default function Handler() {
  const baseStore = useBaseStore();

  return baseStore.currentRoute ? (
    <Rendrer
      path={baseStore.currentRoute?.path || ''}
      content={baseStore.currentRoute?.content || ''}
      next={baseStore.currentRoute?.next}
      prev={baseStore.currentRoute?.prev}
      is404={baseStore.is404}
      baseRoute={baseStore.meta?.baseRoute}
    />
  ) : (
    <>
      <Skeleton className="h-13 w-1/3 mb-4 mt-10" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-4/7 mb-2" />
      <Skeleton className="h-80 w-96 mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-4/7 mb-2" />

      <div className="flex justify-between mt-12 w-full">
        <Skeleton className="h-20 w-1/3" />
        <Skeleton className="h-20 w-1/3" />
      </div>
    </>
  );
}

export function Rendrer({
  path,
  content,
  next,
  prev,
  is404,
  baseRoute
}: {
  path: string;
  content: string;
  next?: string;
  prev?: string;
  is404?: boolean;
  baseRoute?: string;
}) {
  const articleRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useHotkeys(
    'alt+shift+enter',
    (e) => {
      e.preventDefault();
      if (prev && prevRef.current) prevRef.current.click();
    },
    [prev]
  );

  useHotkeys(
    'alt+enter',
    (e) => {
      e.preventDefault();
      if (next && nextRef.current) nextRef.current.click();
    },
    [next]
  );

  useEffect(() => {
    if (!articleRef.current) return;

    const article = articleRef.current;
    article.querySelectorAll('a').forEach((elem: HTMLAnchorElement) => {
      if (
        elem.getAttribute('href')?.startsWith('http://') ||
        elem.getAttribute('href')?.startsWith('https://')
      )
        return;

      elem.addEventListener('click', (e) => {
        e.preventDefault();
        navigate({ to: elem.getAttribute('href') || '/' });
      });
    });
  }, [articleRef.current, content]);

  return (
    <>
      <main className="py-10 w-full">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2 justify-start">
            {isMobile && <SidebarTrigger variant="outline" />}
            {is404 ? null : <Bettercrumb path={path} />}
          </div>
          <div className="flex items-center gap-2 justify-end">
            <ThemeSwitch />
            <Search />
          </div>
        </div>

        {is404 ? (
          <div className="flex flex-col gap-4 items-center justify-center h-[80vh] mt-8">
            <h1 className="text-7xl font-bold tracking-wider">404</h1>
            <p>Oops! You landed on a page that doesn't exist.</p>
            <Button variant="default" className="mt-8" asChild>
              <IntentLink to={baseRoute || "/"}><HomeIcon /> Back to Home</IntentLink>
            </Button>
          </div>
        ) : (
          <>
            <article
              ref={articleRef}
              className="main-article w-full mt-8"
              dangerouslySetInnerHTML={{ __html: content }}
            />
            <div className="flex justify-between mt-10 w-full">
              {prev ? (
                <>
                  <Button variant="outline" asChild ref={prevRef}>
                    <IntentLink to={prev}>
                      Previous <Kbd>Alt + Shift + ⏎</Kbd>
                    </IntentLink>
                  </Button>
                </>
              ) : (
                <span></span>
              )}
              {next ? (
                <>
                  <Button variant="outline" asChild ref={nextRef}>
                    <IntentLink to={next}>
                      Next <Kbd>Alt + ⏎</Kbd>
                    </IntentLink>
                  </Button>
                </>
              ) : (
                <span></span>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
