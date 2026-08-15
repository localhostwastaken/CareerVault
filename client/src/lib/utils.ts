import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Our type scale lives in @theme as --text-display … --text-micro. tailwind-merge
// only knows Tailwind's stock sizes, so it filed `text-body-lg` under text-COLOUR
// and silently dropped `text-primary-foreground` from every class list that used
// both — ink-on-ink invisible button labels. Teaching it the scale fixes the whole
// class of bug; add any new --text-* token here too.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'h1', 'h2', 'h3', 'body', 'body-lg', 'label', 'micro'] }],
    },
  },
})

/** Merge Tailwind class lists, resolving conflicts. The only class-composition helper. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
