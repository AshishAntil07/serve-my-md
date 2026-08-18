import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ClassValue } from 'clsx';
import type React from 'react';

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs));
}

export function extractText(
  html: string
): { targetElement: HTMLElement; text: string }[] {
  const template = document.createElement('div');
  template.classList.add('template');
  template.innerHTML = html;

  const flattened = flatDom([template]);

  return flattened.map((el) => ({ targetElement: el, text: el.textContent }));
}

export function flatDom(elements: HTMLElement[]): HTMLElement[] {
  return elements.reduce((acc, el) => {
    if (el.children.length === 0) return [...acc, el];

    return [...acc, ...flatDom(Array.from(el.children) as HTMLElement[])];
  }, [] as HTMLElement[]);
}

export function getTitleFromExtraction(
  extraction: ReturnType<typeof extractText>
): string {
  const title = extraction.find(
    ({ targetElement }) => targetElement.tagName === 'H1'
  );

  return title?.text || '';
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// export function markElements(root: HTMLElement) {
//   markElementsFromExtraction(flatDom([root]));
// }

// export function markElementsFromExtraction(
//   extraction: ReturnType<typeof extractText> | ReturnType<typeof flatDom>
// ) {
//   extraction.forEach((el, index) => {
//     const element = 'targetElement' in el ? el.targetElement : el;
//     if (element.textContent) {
//       element.setAttribute('data-label', index.toString());
//     }
//   });
// }

export function highlightSubstring(
  text: string,
  substring: string
): React.ReactNode[] {
  if (!substring) return [text];

  const result: React.ReactNode[] = [];
  let occurrence = -1,
    prev = 0;

  const lowercaseText = text.toLowerCase(),
    lowercaseSubstring = substring.toLowerCase();

  while ((occurrence = lowercaseText.indexOf(lowercaseSubstring, prev)) + 1) {
    result.push(text.slice(prev, occurrence));
    prev = occurrence + substring.length;
    result.push(<mark key={occurrence}>{text.slice(occurrence, prev)}</mark>);
  }
  result.push(text.slice(prev));

  return result;
}
