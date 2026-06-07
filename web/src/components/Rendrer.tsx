import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

import Bettercrumb from './Bettercrumb';
import { Button } from './ui/button';
import IntentLink from './IntentLink';
import { Kbd } from './ui/kbd';
import { SidebarTrigger } from './ui/sidebar';
import { useIsMobile } from '@/hooks/useMobile';
import { markElements, slugify } from '@/lib/utils';
import Search from './Search';
import ThemeSwitch from './ThemeSwitcher';
import pathBrowser from 'path-browserify';
import out from '@/.generated/output.json' with { type: 'json' };

export default function Rendrer({
  path,
  content,
  next,
  prev,
  title
}: {
  path: string;
  content: string;
  next?: string;
  prev?: string;
  title: string;
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
          elem.getAttribute('href')?.startsWith('https://') ||
          !out.routes.find((r) => r.path === elem.getAttribute('href'))
        )
          return;

      elem.setAttribute(
        'href',
        pathBrowser.join(out.baseRoute || '/', elem.getAttribute('href') || '')
      );

      elem.addEventListener('click', (e) => {
        e.preventDefault();
        navigate({ to: elem.getAttribute('href') || '/' });
      });
    });

    markElements(article);
    article.querySelectorAll('h1,h2,h3,h4').forEach((element) => {
      element.id = slugify(element.textContent);

      const a = document.createElement('a');
      a.href = `#${element.id}`;
      a.classList.add('heading-anchor');
      a.innerHTML = element.innerHTML;
      element.innerHTML = '';
      element.appendChild(a);
    });

    // Prism.highlightAllUnder(article, true);
  }, [articleRef.current]);

  return (
    <>
      <main className="py-10 w-full">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2 justify-start">
            {isMobile && <SidebarTrigger variant="outline" />}
            <Bettercrumb path={path} />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <ThemeSwitch />
            <Search />
          </div>
        </div>

        <h1 className="text-3xl font-bold mt-4">{title}</h1>

        <article
          ref={articleRef}
          className="main-article w-full mt-4"
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
      </main>
    </>
  );
}
