'use client';

import { useSyncExternalStore } from 'react';
import { dhakaNow, type DhakaNow } from '@/lib/time';

// One shared minute-resolution clock for all live widgets on a page.
let snapshot: DhakaNow | null = null;
let key = '';
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function refresh(): boolean {
  const n = dhakaNow();
  const k = `${n.iso}-${n.minutes}`;
  if (k === key) return false;
  key = k;
  snapshot = n;
  return true;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    timer = setInterval(() => {
      if (refresh()) listeners.forEach((l) => l());
    }, 15_000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function getSnapshot(): DhakaNow {
  if (!snapshot) refresh();
  return snapshot!;
}

/** Current Asia/Dhaka time on the client; `null` during SSR/hydration (neutral HTML). */
export function useDhakaNow(): DhakaNow | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
