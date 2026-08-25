import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '');         // Trim - from end of text
}

export function formatDate(date: string | Date | undefined | null): Date {
  if (!date) {
    return new Date();
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  return isNaN(d.getTime()) ? new Date() : d;
}

/** Single source of truth for display order: visible sections, sorted by `order`. */
export function orderedVisibleSections<T extends { visible?: boolean; order?: number }>(sections: T[]): T[] {
  return (Array.isArray(sections) ? sections : [])
    .filter((section) => section?.visible)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
