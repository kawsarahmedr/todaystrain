'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Option = { id: string; bn: string };
type RouteRef = { slug: string; from: string; to: string };

/**
 * Works without JavaScript (plain GET to /search/). With JS, a pair that has its own
 * route page goes straight there.
 */
export function RouteSearchForm({ stations, routes }: { stations: Option[]; routes: RouteRef[] }) {
  const router = useRouter();
  const [error, setError] = useState('');

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const fd = new FormData(e.currentTarget);
    const from = String(fd.get('from') ?? '');
    const to = String(fd.get('to') ?? '');
    if (!from || !to || from === to) {
      e.preventDefault();
      setError('ভিন্ন দুটি স্টেশন বেছে নিন।');
      return;
    }
    const r = routes.find(
      (x) => (x.from === from && x.to === to) || (x.from === to && x.to === from),
    );
    if (r) {
      e.preventDefault();
      router.push(`/route/${r.slug}/#${r.from === from ? 'forward' : 'reverse'}`);
    }
  };

  const select =
    'mt-1 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900';
  return (
    <form action="/search/" method="get" onSubmit={onSubmit} className="card p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block text-sm font-medium text-slate-700">
          কোথা থেকে
          <select name="from" required defaultValue="dhaka" className={select}>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.bn}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          কোথায়
          <select name="to" required defaultValue="" className={select}>
            <option value="" disabled>
              স্টেশন বেছে নিন
            </option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.bn}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary w-full sm:w-auto">
          ট্রেন খুঁজুন
        </button>
      </div>
      <p className="mt-2 h-5 text-sm text-rose-700" role="alert">
        {error}
      </p>
    </form>
  );
}
