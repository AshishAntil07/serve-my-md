import ReactDOM from 'react-dom';
import { SearchIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

import { Button } from './ui/button';
import { Input } from './ui/input';

import type { Dispatch, SetStateAction } from 'react';
import {
  cn,
  extractText,
  getTitleFromExtraction,
  highlightSubstring
} from '@/lib/utils';
import { useRouterState } from '@tanstack/react-router';
import IntentLink from './IntentLink';

type SearchResult = {
  path: string;
  title: string;
  matches: number;
  text: string;
  targetElement: HTMLElement;
};

type SearchResultSimple = {
  text: string;
  targetElement: HTMLElement;
};

type SearchResults = {
  internal: SearchResultSimple[];
  external: SearchResult[];
};

export default function Search() {
  const [trig, trigger] = useState(false);
  const [results, setResults] = useState<{
    internal: SearchResultSimple[];
    external: SearchResult[];
  }>({
    internal: [],
    external: []
  });
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const onChange = (val: string) => {
    if (!val) {
      setResults({ internal: [], external: [] });

      return;
    }

    // setResults(
    //   output.routes.reduce(
    //     (acc, route) => {
    //       const extraction = extractText(route.content);

    //       if (route.path === pathname) {
    //         extraction.forEach(({ targetElement, text }) => {
    //           if (text.toLowerCase().includes(val.toLowerCase())) {
    //             acc.internal.push({
    //               text,
    //               targetElement
    //             });
    //           }
    //         });

    //         return acc;
    //       }

    //       extraction.every(({ targetElement, text }) => {
    //         if (text.toLowerCase().includes(val.toLowerCase())) {
    //           acc.external.push({
    //             path: route.path,
    //             matches: (text.match(new RegExp(val, 'gi')) || []).length,
    //             text,
    //             targetElement,
    //             title: getTitleFromExtraction(extraction)
    //           });

    //           return false;
    //         }

    //         return true;
    //       });

    //       return acc;
    //     },
    //     { internal: [], external: [] } as typeof results
    //   )
    // );
  };

  useEffect(() => {
    setResults({ internal: [], external: [] });
  }, [trig]);

  useHotkeys('ctrl+shift+f', () => trigger((t) => !t));
  useHotkeys('esc', () => trigger(false));

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        title="Search"
        onClick={() => trigger((t) => !t)}
        aria-keyshortcuts="Ctrl+Shift+F"
      >
        <SearchIcon />
      </Button>
      <SearchInput
        displayState={trig}
        trigger={trigger}
        onChange={onChange}
        searchResults={results}
      />
    </>
  );
}

interface SearchInputProps {
  trigger: Dispatch<SetStateAction<boolean>>;
  displayState: boolean;
  query?: string;
  onChange: (val: string) => void;
  searchResults: SearchResults;
}

function SearchInput({
  displayState,
  trigger,
  query,
  onChange,
  searchResults
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [changed, setChanged] = useState(0);
  const [value, setValue] = useState(query || '');

  useEffect(() => {
    setChanged((c) => c + 1);
  }, [searchResults]);

  useEffect(() => {
    function remInput(e: MouseEvent) {
      if (!inputRef.current) return;

      const input = inputRef.current;
      const rect = input.getBoundingClientRect();
      if (
        e.clientX < rect.x ||
        e.clientY < rect.y ||
        e.clientX > rect.x + rect.width ||
        e.clientY > rect.y + rect.height
      ) {
        trigger(false);
      }
    }

    if (displayState)
      setTimeout(() => document.addEventListener('click', remInput), 100);

    return () => {
      if (displayState) document.removeEventListener('click', remInput);
    };
  }, [displayState]);

  useEffect(() => {
    setChanged(0);
    setValue(query || '');
    if (displayState && inputRef.current) {
      inputRef.current.focus();
    }
  }, [displayState]);

  if (!displayState) return null;

  return ReactDOM.createPortal(
    <div
      className={cn(
        'fixed top-0 left-0 w-full h-screen z-50 transition-all',
        searchResults.internal.length + searchResults.external.length ||
          changed > 2
          ? 'bg-background/50 backdrop-blur-sm'
          : ''
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          trigger(false);
        }
      }}
    >
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-1/2">
        <Input
          className="shadow-[0px_-25px_50px_-10px_black] backdrop-blur-md bg-background/80!"
          placeholder="Search for a candy.."
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.currentTarget.value);
            onChange(e.currentTarget.value);
          }}
        />

        <SearchResults searchResults={searchResults} query={value} />
      </div>
    </div>,
    document.body
  );
}

interface SearchResultsProps {
  searchResults: SearchResults;
  query: string;
}

function SearchResults({ searchResults, query }: SearchResultsProps) {
  if (!searchResults.internal.length && !searchResults.external.length) {
    return <></>;
  }

  return (
    <>
      {searchResults.internal.length > 0 && (
        <p className="px-2 text-sm text-muted-foreground">On this page</p>
      )}
      {searchResults.internal.map(
        (result, i) =>
          !result.targetElement.classList.contains('template') && (
            <div
              key={i}
              onClick={() => {
                if (result.targetElement.getAttribute('data-label')) {
                  const el = document.querySelector(
                    `[data-label="${result.targetElement.getAttribute('data-label')}"]`
                  ) as HTMLElement;
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                } else if (result.targetElement.id) {
                  const el = document.getElementById(result.targetElement.id);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="cursor-pointer p-2 rounded hover:bg-secondary"
            >
              <p>{highlightSubstring(result.text, query)}</p>
            </div>
          )
      )}

      <hr className="my-4" />

      {searchResults.external.map((result, i) => (
        <IntentLink
          key={i}
          to={result.path}
          className="block p-3 rounded hover:bg-secondary border border-outline my-3"
        >
          <p className="text-sm text-muted-foreground">In {result.title}</p>
          <div className="flex items-center gap-2">
            <p className="block text-ellipsis w-full overflow-hidden text-nowrap">
              {highlightSubstring(result.text, query)}
            </p>
            <span className="py-1 px-1.5 rounded bg-secondary text-xs float-right text-nowrap">
              matches: {result.matches}
            </span>
          </div>
        </IntentLink>
      ))}
    </>
  );
}
