import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdSlot } from '@/components/AdSlot';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { JsonLd } from '@/components/JsonLd';
import { TodayEnhancer } from '@/components/live/TodayEnhancer';
import { TrainLiveBox } from '@/components/live/TrainLiveBox';
import { StopTable } from '@/components/tables';
import { DataNotice, OffDay, TodayOffBadge, TypeBadge } from '@/components/ui';
import { publishedRoutes, routeSlug } from '@/content/validate-routes';
import { WEEKDAYS_BN, atTimeBn, formatDurationBn, formatTimeBn, toBnDigits } from '@/lib/bn';
import {
  TYPE_LABEL,
  allStations,
  legsBetween,
  stationName,
  trainGroup,
  trainGroups,
} from '@/lib/data';
import { faqSchema, pageMetadata } from '@/lib/seo';
import { durationMinutes } from '@/lib/time';
import type { Train } from '@/lib/types';

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;

export function generateStaticParams() {
  return trainGroups().map((g) => ({ slug: g.slug }));
}

const nums = (ts: Train[]) => ts.map((t) => toBnDigits(t.number ?? '')).join('/');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = trainGroup((await params).slug);
  if (!g) return {};
  const t = g.trains[0]!;
  return pageMetadata({
    title: `${g.name} (${nums(g.trains)}) সময়সূচী, স্টেশন ও বন্ধের দিন`,
    description: `${g.name}: ${stationName(t.origin)}–${stationName(t.destination)} পথের প্রতিটি স্টেশনের পৌঁছা ও ছাড়ার সময়, সাপ্তাহিক বন্ধ, যাত্রাকাল এবং সময়সূচী অনুযায়ী আনুমানিক অবস্থান।`,
    path: `/train/${g.slug}/`,
  });
}

function offDaySentence(ts: Train[]): string {
  const days = new Set(ts.map((t) => t.offDay));
  if (days.size === 1) {
    const d = ts[0]!.offDay;
    return d === null
      ? 'এই ট্রেনের কোনো সাপ্তাহিক বন্ধ নেই, সপ্তাহের সাত দিনই চলে।'
      : `সাপ্তাহিক বন্ধ ${WEEKDAYS_BN[d]}।`;
  }
  return (
    ts
      .map(
        (t) =>
          `${toBnDigits(t.number ?? '')} নম্বর ${t.offDay === null ? 'প্রতিদিন চলে' : `${WEEKDAYS_BN[t.offDay]} বন্ধ থাকে`}`,
      )
      .join(', আর ') + '।'
  );
}

export default async function TrainPage({ params }: Props) {
  const g = trainGroup((await params).slug);
  if (!g) notFound();
  const stationsById = new Map(allStations().map((s) => [s.id, s]));
  const first = g.trains[0]!;
  const path = `/train/${g.slug}/`;
  const routes = publishedRoutes().filter((r) =>
    [...legsBetween(r.from, r.to), ...legsBetween(r.to, r.from)].some((l) =>
      g.trains.includes(l.train),
    ),
  );

  const lead = g.trains.map((t) => {
    const dur = durationMinutes(t.departure, t.arrival);
    return `${toBnDigits(t.number ?? '')} নম্বর ট্রেনটি ${atTimeBn(t.departure)} ${stationName(t.origin)} ছেড়ে ${atTimeBn(t.arrival)} ${stationName(t.destination)} পৌঁছায় — পথে ${toBnDigits(t.stops.length - 2)}টি স্টেশনে থামে এবং সময় লাগে ${formatDurationBn(dur)}।`;
  });

  const faqs = [
    { q: `${g.name} কোন দিন বন্ধ থাকে?`, a: offDaySentence(g.trains) },
    ...g.trains.map((t) => ({
      q: `${g.name} (${toBnDigits(t.number ?? '')}) ${stationName(t.origin)} থেকে কখন ছাড়ে?`,
      a: `${stationName(t.origin)} থেকে ছাড়ে ${atTimeBn(t.departure)} এবং ${stationName(t.destination)} পৌঁছায় ${atTimeBn(t.arrival)}; মোট সময় লাগে ${formatDurationBn(durationMinutes(t.departure, t.arrival))}।`,
    })),
    {
      q: `${g.name} কোন কোন স্টেশনে থামে?`,
      a: `${toBnDigits(first.number ?? '')} নম্বর ট্রেনের যাত্রাপথ: ${first.stops.map((s) => stationName(s.station)).join(', ')}।`,
    },
  ];
  const hasGaps = g.trains.some((t) => t.stops.slice(1, -1).some((s) => !s.arr || !s.dep));

  return (
    <div className="container-page py-8">
      <Breadcrumbs
        items={[
          { name: 'ট্রেন', path: '/trains/' },
          { name: g.name, path },
        ]}
      />
      <h1 className="text-2xl leading-snug font-bold sm:text-3xl">
        {g.name} ({nums(g.trains)}) সময়সূচী
      </h1>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-slate-600">
        <TypeBadge type={first.type} /> {stationName(first.origin)} ⇄{' '}
        {stationName(first.destination)}
      </p>

      <div className="mt-6 space-y-3 text-[1.05rem] text-slate-800">
        <p>
          {g.name} {stationName(first.origin)} ও {stationName(first.destination)}-এর মধ্যে চলাচলকারী
          একটি {TYPE_LABEL[first.type]} ট্রেন। {lead.join(' ')} {offDaySentence(g.trains)}
        </p>
        <p className="text-slate-700">
          নিচে প্রতিটি দিকের সম্পূর্ণ স্টেশন তালিকা দেওয়া হলো। “বিরতি” কলামে দেখানো হয়েছে কোন
          স্টেশনে ট্রেন কত মিনিট থামার কথা; মধ্যরাত পেরোনোর পরের সময়ের পাশে “পরদিন” লেখা আছে।
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {g.trains.map((t) => (
          <div key={t.id} className="card p-4" data-offday={t.offDay ?? undefined}>
            <p className="font-semibold">
              {toBnDigits(t.number ?? '')}: {stationName(t.origin)} → {stationName(t.destination)}
            </p>
            <p className="mt-1 text-[0.95rem] text-slate-700">
              ছাড়ে {formatTimeBn(t.departure)} · পৌঁছায় {formatTimeBn(t.arrival)}
            </p>
            <p className="mt-1 text-[0.95rem] text-slate-700">
              সাপ্তাহিক বন্ধ: <OffDay day={t.offDay} />
              <TodayOffBadge />
            </p>
          </div>
        ))}
      </div>

      <AdSlot id="train-top" />

      {g.trains.map((t) => (
        <section key={t.id} className="mt-10" id={`train-${t.id}`}>
          <h2 className="mb-3 text-xl font-bold">
            {toBnDigits(t.number ?? '')}: {stationName(t.origin)} থেকে {stationName(t.destination)}
          </h2>
          <TrainLiveBox
            offDay={t.offDay}
            stops={t.stops}
            names={t.stops.map((s) => stationName(s.station))}
          />
          <div className="mt-4">
            <StopTable train={t} stationsById={stationsById} />
          </div>
        </section>
      ))}
      {hasGaps && (
        <p className="note mt-4">
          “—” চিহ্নিত ঘরে উৎস নথিতে সময় নেই, অথবা নথির সময় অসঙ্গত হওয়ায় অনুমান না করে ফাঁকা রাখা
          হয়েছে। বিস্তারিত: <Link href="/notices/#corrections-log">তথ্য সংশোধন লগ</Link>।
        </p>
      )}

      {routes.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">যে রুটে এই ট্রেন চলে</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {routes.map((r) => (
              <li key={routeSlug(r)}>
                <Link
                  href={`/route/${routeSlug(r)}/`}
                  className="hover:border-brand-400 inline-block rounded-full border border-slate-300 bg-white px-3 py-1.5 no-underline"
                >
                  {stationName(r.from)}–{stationName(r.to)} রুটের সব ট্রেন
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-bold">সাধারণ জিজ্ঞাসা</h2>
        <div className="mt-4 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="card p-4" open>
              <summary className="cursor-pointer font-semibold">{f.q}</summary>
              <p className="mt-2 text-slate-700">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <DataNotice />
      <JsonLd data={faqSchema(faqs)} />
      <TodayEnhancer />
    </div>
  );
}
