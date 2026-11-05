'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { WEEKDAYS_BN, formatDurationBn, formatTimeBn, toBnDigits } from '@/lib/bn';
import { DAY, stopOffsets, toMinutes } from '@/lib/time';

type IndexTrain = {
  id: string;
  n: string | null;
  name: string;
  type: string;
  off: number | null;
  p: string | null;
  v: boolean;
  s: [string, string | null, string | null][];
};
type SearchIndex = { stations: [string, string, string][]; trains: IndexTrain[] };

const noopSubscribe = () => () => {};

export function SearchResults() {
  const search = useSyncExternalStore(
    noopSubscribe,
    () => window.location.search,
    () => null,
  );
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch('/data/search-index.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: SearchIndex) => setIndex(d))
      .catch(() => setFailed(true));
  }, []);

  const box = 'min-h-48';
  if (search === null || (!index && !failed)) {
    return <p className={`${box} text-slate-500`}>ফলাফল খোঁজা হচ্ছে…</p>;
  }
  if (failed || !index) {
    return (
      <p className={`${box} text-rose-700`}>তথ্য লোড করা যায়নি। পাতাটি আবার চালু করে দেখুন।</p>
    );
  }
  const params = new URLSearchParams(search);
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const names = new Map(index.stations.map(([id, bn]) => [id, bn]));
  if (!names.has(from) || !names.has(to) || from === to) {
    return <p className={`${box} text-slate-700`}>ওপরের ফর্ম থেকে ভিন্ন দুটি স্টেশন বেছে নিন।</p>;
  }

  const legs = index.trains
    .map((t) => {
      const stops = t.s.map(([station, arr, dep]) => ({ station, arr, dep }));
      const i = stops.findIndex((s) => s.station === from);
      const j = stops.findIndex((s) => s.station === to);
      if (i < 0 || j <= i || !stops[i]!.dep) return null;
      const timed = stopOffsets(stops);
      const a = timed[i]!;
      const b = timed[j]!;
      const dep0 = toMinutes(stops[0]!.dep ?? '00:00');
      const offDay =
        t.off === null ? null : (t.off + Math.floor((dep0 + (a.depOffset ?? 0)) / DAY)) % 7;
      return {
        t,
        dep: a.dep!,
        arr: (b.arr ?? b.dep)!,
        duration: (b.arrOffset ?? b.depOffset ?? 0) - (a.depOffset ?? 0),
        offDay,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((x, y) => toMinutes(x.dep) - toMinutes(y.dep));

  return (
    <div className={box}>
      <h2 className="text-xl font-bold">
        {names.get(from)} থেকে {names.get(to)}: {toBnDigits(legs.length)}টি সরাসরি ট্রেন
      </h2>
      {legs.length === 0 ? (
        <p className="mt-3 text-slate-700">
          এই সময়সূচীতে দুটি স্টেশনের মধ্যে সরাসরি কোনো ট্রেন পাওয়া যায়নি। পূর্বাঞ্চলের ট্রেনগুলোর
          ক্ষেত্রে আপাতত কেবল যাত্রা শুরু ও শেষের স্টেশন যুক্ত আছে, তাই মাঝের স্টেশন দিয়ে খুঁজলে ফল
          না-ও আসতে পারে।
        </p>
      ) : (
        <div className="tt-wrap mt-3">
          <table className="tt">
            <thead>
              <tr>
                <th scope="col">ট্রেন</th>
                <th scope="col">ছাড়ে</th>
                <th scope="col">পৌঁছায়</th>
                <th scope="col">সময় লাগে</th>
                <th scope="col">বন্ধ</th>
              </tr>
            </thead>
            <tbody>
              {legs.map((l) => (
                <tr key={l.t.id}>
                  <td className="min-w-40">
                    {l.t.p ? <Link href={l.t.p}>{l.t.name}</Link> : l.t.name}
                    {l.t.n && <span className="text-slate-500"> ({toBnDigits(l.t.n)})</span>}
                    {!l.t.v && (
                      <span
                        className="ms-1 text-amber-700"
                        title="স্ক্যান থেকে হাতে তোলা; যাচাই চলছে"
                      >
                        ✱
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">{formatTimeBn(l.dep)}</td>
                  <td className="whitespace-nowrap">{formatTimeBn(l.arr)}</td>
                  <td className="whitespace-nowrap">{formatDurationBn(l.duration)}</td>
                  <td className="whitespace-nowrap">
                    {l.offDay === null ? 'নেই' : WEEKDAYS_BN[l.offDay]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
