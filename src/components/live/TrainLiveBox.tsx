'use client';

import { WEEKDAYS_BN, atTimeBn, formatDurationBn } from '@/lib/bn';
import { liveState } from '@/lib/time';
import type { Stop } from '@/lib/types';
import { useDhakaNow } from './useDhakaNow';

export function TrainLiveBox({
  offDay,
  stops,
  names,
}: {
  offDay: number | null;
  stops: Stop[];
  names: string[];
}) {
  const now = useDhakaNow();
  let text: React.ReactNode = (
    <span className="text-slate-500">বাংলাদেশ সময় অনুযায়ী হিসাব করা হচ্ছে…</span>
  );
  let progress: number | null = null;
  if (now) {
    const s = liveState({ offDay, stops }, now);
    const origin = names[0] ?? '';
    const dest = names[names.length - 1] ?? '';
    switch (s.kind) {
      case 'off-today':
        text = `আজ ${WEEKDAYS_BN[now.weekday]} — এই ট্রেনের সাপ্তাহিক বন্ধের দিন, আজ ${origin} থেকে ছাড়বে না।`;
        break;
      case 'not-started':
        text = `আজ ${origin} থেকে ${atTimeBn(stops[0]?.dep ?? '')} ছাড়ার কথা — আরও ${formatDurationBn(s.startsIn)} পর।`;
        progress = 0;
        break;
      case 'at-station':
        text =
          s.stopIndex === stops.length - 1
            ? `সময়সূচী অনুযায়ী এইমাত্র ${dest} পৌঁছানোর কথা।`
            : `সময়সূচী অনুযায়ী এখন ${names[s.stopIndex]} স্টেশনে থাকার কথা${s.leavesIn > 0 ? ` (প্রায় ${formatDurationBn(s.leavesIn)} পর ছাড়বে)` : ''}।`;
        progress = s.stopIndex / Math.max(1, stops.length - 1);
        break;
      case 'between':
        text = `সময়সূচী অনুযায়ী এখন ${names[s.fromIndex]} ও ${names[s.toIndex]}-এর মাঝে; ${names[s.toIndex]} পৌঁছাতে প্রায় ${formatDurationBn(s.arrivesIn)}।${s.fromYesterday ? ' (গতকাল ছেড়ে আসা ট্রেন)' : ''}`;
        progress = (s.fromIndex + s.progress) / Math.max(1, stops.length - 1);
        break;
      case 'arrived':
        text = `আজকের যাত্রা সময়সূচী অনুযায়ী শেষ — ${formatDurationBn(s.minutesAgo)} আগে ${dest} পৌঁছানোর কথা।`;
        progress = 1;
        break;
    }
  }
  return (
    <div className="border-brand-200 bg-brand-50 flex h-40 flex-col overflow-hidden rounded-lg border p-4 sm:h-36">
      <p className="text-brand-900 text-sm font-semibold">সময়সূচী অনুযায়ী আনুমানিক অবস্থান</p>
      <p className="mt-1 line-clamp-3 text-[0.95rem] leading-6 text-slate-800" aria-live="polite">
        {text}
      </p>
      <div className="bg-brand-100 mt-auto h-1.5 rounded" aria-hidden="true">
        {progress !== null && (
          <div
            className="bg-brand-600 h-full rounded"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        )}
      </div>
      <p className="mt-1.5 text-xs text-slate-600">
        এটি রিয়েল-টাইম ট্র্যাকিং নয়; ট্রেন দেরিতে চললে আসল অবস্থান ভিন্ন হবে।
      </p>
    </div>
  );
}
