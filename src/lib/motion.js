'use client';

import { useSyncExternalStore } from 'react';

function mediaStore(query) {
  return {
    subscribe(callback) {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    get: () => window.matchMedia(query).matches,
  };
}

const reduced = mediaStore('(prefers-reduced-motion: reduce)');
const fine = mediaStore('(hover: hover) and (pointer: fine)');

/** True when the system asks for less motion. False during SSR. */
export function useReducedMotion() {
  return useSyncExternalStore(reduced.subscribe, reduced.get, () => false);
}

/** True for a mouse or trackpad; false on touch screens. False during SSR. */
export function useFinePointer() {
  return useSyncExternalStore(fine.subscribe, fine.get, () => false);
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && reduced.get();
}
