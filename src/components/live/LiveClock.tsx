'use client';

import { WEEKDAYS_BN, formatDateBn, formatTimeBn } from '@/lib/bn';
import { fromMinutes } from '@/lib/time';
import { useDhakaNow } from './useDhakaNow';

export function LiveClock({ className = '' }: { className?: string }) {
  const now = useDhakaNow();
  return (
    <p
      className={`flex h-12 items-start gap-2 overflow-hidden text-[0.95rem] leading-6 sm:h-6 ${className}`}
    >
      <span
        className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500"
        aria-hidden="true"
      />
      {now ? (
        <span>
          আজ {WEEKDAYS_BN[now.weekday]}, {formatDateBn(now.iso)} · বাংলাদেশ সময়{' '}
          {formatTimeBn(fromMinutes(now.minutes))}
        </span>
      ) : (
        <span className="text-slate-500">বাংলাদেশ সময় (Asia/Dhaka)</span>
      )}
    </p>
  );
}
