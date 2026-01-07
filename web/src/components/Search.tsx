import ReactDOM from 'react-dom';
import { SearchIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

import { Button } from './ui/button';
import { Input } from './ui/input';

import type { Dispatch, SetStateAction } from 'react';

export default function Search() {
  const [trig, trigger] = useState(false);

  useHotkeys('ctrl+shift+f', () => trigger((t) => !t));

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        title="Search"
        onClick={() => trigger((t) => !t)}
        aria-keyshortcuts='Ctrl+Shift+F'
      >
        <SearchIcon />
      </Button>
      <SearchInput displayState={trig} trigger={trigger} />
    </>
  );
}

interface SearchInputProps {
  trigger: Dispatch<SetStateAction<boolean>>;
  displayState: boolean;
  query?: string;
}

function SearchInput({ displayState, trigger, query }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

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

    if (displayState) setTimeout(() => document.addEventListener('click', remInput), 100);

    return () => {
      if (displayState) document.removeEventListener('click', remInput);
    };
  }, [displayState]);

  useEffect(() => {
    if (displayState && inputRef.current) {
      inputRef.current.focus();
    }
  }, [displayState]);

  if (!displayState) return null;

  return ReactDOM.createPortal(
    <>
      <Input
        className="fixed top-4 left-1/2 -translate-x-1/2 w-1/2 shadow-[0px_-25px_50px_-10px_black] backdrop-blur-md bg-background/80!"
        placeholder="Search for a candy.."
        ref={inputRef}
        defaultValue={query}
      />
    </>,
    document.body
  );
}
