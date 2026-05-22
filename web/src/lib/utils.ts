import {  clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type {ClassValue} from 'clsx';

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export function extractText(html: string): {targetElement: HTMLElement, text: string}[] {
  const template = document.createElement('div');
  template.classList.add("template");
  template.innerHTML = html;

  const flattened = flatDom([template]);
  markElementsFromExtraction(flattened);

  return flattened.map((el) => ({ targetElement: el, text: el.textContent }));
}

export function flatDom(elements: HTMLElement[]): HTMLElement[] {
  return elements.reduce((acc, el) => {
    if (el.children.length === 0) return [...acc, el];

    return [...acc, el, ...flatDom(Array.from(el.children) as HTMLElement[])];
  }, [] as HTMLElement[]);
}

export function getTitleFromExtraction(extraction: ReturnType<typeof extractText>): string {
  const title = extraction.find(({ targetElement }) => targetElement.tagName === 'H1');

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

const headings = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];

export function markElements(root: HTMLElement) {
  markElementsFromExtraction(flatDom([root]));
}

export function markElementsFromExtraction(extraction: ReturnType<typeof extractText> | ReturnType<typeof flatDom>) {
  extraction.forEach((el, index) => {
    const element = 'targetElement' in el ? el.targetElement : el;
    if (element.textContent) {
      if(headings.includes(element.tagName.toUpperCase())) {
        element.id = slugify(element.textContent);
      } else {
        element.setAttribute("data-label", index.toString());
      }
    }
  });
}