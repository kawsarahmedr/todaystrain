'use client';

import { formatDurationBn, formatTimeBn } from '@/lib/bn';
import { upcomingDepartures, type DepartureCandidate } from '@/lib/time';
import { useDhakaNow } from './useDhakaNow';

export type DepartureItem = DepartureCandidate & { label: string; time: string };

export function NextDepartures({
  title,
  items,
  limit = 2,
}: {
  title: string;
  items: DepartureItem[];
  limit?: number;
}) {
  const now = useDhakaNow();
  const next = now ? upcomingDepartures(items, now, limit) : null;
  const byKey = new Map(items.map((i) => [i.key, i]));
  return (
    <div
      className="card flex flex-col overflow-hidden p-4"
      style={{ height: `${5.5 + limit * 3}rem` }}
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <ul className="mt-2 space-y-1.5 text-[0.95rem]" aria-live="polite">
        {next === null && (
          <li className="text-slate-500">বাংলাদেশ সময় অনুযায়ী হিসাব করা হচ্ছে…</li>
        )}
        {next?.length === 0 && (
          <li className="text-slate-600">আজ ও আগামীকাল সময়সূচীতে কোনো ট্রেন নেই।</li>
        )}
        {next?.map((d) => {
          const it = byKey.get(d.key)!;
          return (
            <li key={d.key} className="leading-6">
              <span className="block truncate font-medium">{it.label}</span>
              <span className="block truncate text-sm text-slate-600">
                {d.tomorrow ? 'আগামীকাল ' : ''}
                {formatTimeBn(it.time)} — {formatDurationBn(d.minutesUntil)} পর
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-auto text-xs text-slate-600">
        বাংলাদেশ সময় ও সাপ্তাহিক বন্ধ মিলিয়ে, সময়সূচী অনুযায়ী হিসাব।
      </p>
    </div>
  );
}
