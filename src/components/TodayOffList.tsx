import Link from 'next/link';
import { WEEKDAYS_BN } from '@/lib/bn';
import { stationName } from '@/lib/data';
import { dhakaNow } from '@/lib/time';
import type { Train } from '@/lib/types';
import { TrainLabel } from './ui';

/**
 * All seven weekday panels are in the HTML. The build-day panel is visible by default
 * (the site is rebuilt every night at 00:30 Dhaka time) and TodayEnhancer switches to
 * the visitor's actual Dhaka weekday. Fixed height, so switching never shifts layout.
 */
export function TodayOffList({
  trains,
  headingLevel = 2,
}: {
  trains: Train[];
  headingLevel?: 2 | 3;
}) {
  const today = dhakaNow().weekday;
  const byDay: Train[][] = Array.from({ length: 7 }, () => []);
  for (const t of trains) if (t.offDay !== null) byDay[t.offDay]!.push(t);
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section aria-labelledby="today-off">
      <H id="today-off" className="text-xl font-bold">
        আজ (<span data-today-name>{WEEKDAYS_BN[today]}</span>) যে আন্তঃনগর ট্রেনগুলো বন্ধ
      </H>
      <div className="card mt-3 h-72 overflow-y-auto p-4">
        {byDay.map((list, d) => (
          <div key={d} data-weekday-panel={d} hidden={d !== today}>
            {list.length === 0 ? (
              <p className="text-slate-700">এই দিনে কোনো আন্তঃনগর ট্রেনের সাপ্তাহিক বন্ধ নেই।</p>
            ) : (
              <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {list.map((t) => (
                  <li key={t.id} className="leading-6">
                    <TrainLabel train={t} />
                    <span className="block text-sm text-slate-600">
                      {stationName(t.origin)} → {stationName(t.destination)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-sm text-slate-600">
        সাপ্তাহিক বন্ধ মানে সেদিন ট্রেনটি যাত্রা শুরুর স্টেশন থেকে ছাড়ে না।{' '}
        <Link href="/today/">সপ্তাহের সব দিনের তালিকা দেখুন</Link>
      </p>
    </section>
  );
}
