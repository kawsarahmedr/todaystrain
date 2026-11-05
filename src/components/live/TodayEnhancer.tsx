'use client';

import { useEffect } from 'react';
import { WEEKDAYS_BN } from '@/lib/bn';
import { dhakaNow } from '@/lib/time';

/**
 * Applies the "today" layer to server-rendered HTML without re-rendering it:
 *  - [data-offday="N"] rows get data-today-off="true" when N is today's Dhaka weekday
 *  - [data-weekday-panel="N"] panels: only today's is shown
 *  - [data-today-name] elements get today's weekday name
 */
export function TodayEnhancer() {
  useEffect(() => {
    const apply = () => {
      const { weekday } = dhakaNow();
      document.querySelectorAll<HTMLElement>('[data-offday]').forEach((el) => {
        el.dataset.todayOff = String(el.dataset.offday === String(weekday));
      });
      document.querySelectorAll<HTMLElement>('[data-weekday-panel]').forEach((el) => {
        el.hidden = el.dataset.weekdayPanel !== String(weekday);
      });
      document.querySelectorAll<HTMLElement>('[data-today-name]').forEach((el) => {
        el.textContent = WEEKDAYS_BN[weekday] ?? '';
      });
    };
    apply();
    const id = setInterval(apply, 60_000);
    return () => clearInterval(id);
  }, []);
  return null;
}
