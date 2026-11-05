import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdSlot } from '@/components/AdSlot';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { JsonLd } from '@/components/JsonLd';
import { NextDepartures, type DepartureItem } from '@/components/live/NextDepartures';
import { TodayEnhancer } from '@/components/live/TodayEnhancer';
import { LegTable } from '@/components/tables';
import { DataNotice } from '@/components/ui';
import { publishedRoutes, routeSlug } from '@/content/validate-routes';
import { WEEKDAYS_BN, atTimeBn, formatDurationBn, toBnDigits } from '@/lib/bn';
import { legsBetween, stationName, type Leg } from '@/lib/data';
import { faqSchema, pageMetadata } from '@/lib/seo';
import { SITE } from '@/lib/site';
import { toMinutes } from '@/lib/time';

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;

export function generateStaticParams() {
  return publishedRoutes().map((r) => ({ slug: routeSlug(r) }));
}

const findRoute = (slug: string) => publishedRoutes().find((r) => routeSlug(r) === slug);
const trainNames = (legs: Leg[]) => legs.map((l) => l.train.name).join(', ');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = findRoute((await params).slug);
  if (!r) return {};
  const a = stationName(r.from);
  const b = stationName(r.to);
  const fwd = legsBetween(r.from, r.to);
  const fastest = [...fwd].sort((x, y) => x.duration - y.duration)[0];
  return pageMetadata({
    title: `${a} থেকে ${b} ট্রেনের সময়সূচী ও বন্ধের দিন`,
    description: `${a}–${b} রুটে ${toBnDigits(fwd.length)}টি ট্রেনের ছাড়া-পৌঁছার সময়, সাপ্তাহিক বন্ধ ও যাত্রাকাল${fastest ? `; সবচেয়ে দ্রুত ${fastest.train.name} (${formatDurationBn(fastest.duration)})` : ''}। ফিরতি ${b}–${a} সময়সূচীও এক পাতায়।`,
    path: `/route/${routeSlug(r)}/`,
  });
}

function directionFaqs(legs: Leg[], a: string, b: string) {
  if (legs.length === 0) return [];
  const byDur = [...legs].sort((x, y) => x.duration - y.duration);
  const first = legs[0]!;
  const last = legs[legs.length - 1]!;
  const off = legs.filter((l) => l.offDay !== null);
  const daily = legs.filter((l) => l.offDay === null);
  return [
    {
      q: `${a} থেকে ${b} কয়টি ট্রেন চলে?`,
      a: `এই সময়সূচী অনুযায়ী ${a} থেকে ${b} সরাসরি ${toBnDigits(legs.length)}টি ট্রেন চলে: ${trainNames(legs)}।`,
    },
    {
      q: `${a} থেকে ${b} ট্রেনে যেতে কত সময় লাগে?`,
      a: `ট্রেনভেদে ${formatDurationBn(byDur[0]!.duration)} থেকে ${formatDurationBn(byDur[byDur.length - 1]!.duration)}। সবচেয়ে দ্রুত ট্রেন: ${byDur[0]!.train.name}।`,
    },
    {
      q: `${a} থেকে ${b} প্রথম ও শেষ ট্রেন কখন ছাড়ে?`,
      a:
        legs.length === 1
          ? `এই পথে একটিই ট্রেন: ${first.train.name}, ${a} ছাড়ে ${atTimeBn(first.dep)}।`
          : `প্রথম ট্রেন ${first.train.name} ছাড়ে ${atTimeBn(first.dep)}, আর দিনের শেষ ট্রেন ${last.train.name} ছাড়ে ${atTimeBn(last.dep)}।`,
    },
    {
      q: `${a} থেকে ${b} রুটের কোন ট্রেন কোন দিন বন্ধ?`,
      a:
        (off.length
          ? off.map((l) => `${l.train.name} ${WEEKDAYS_BN[l.offDay!]}`).join('; ') + ' বন্ধ থাকে।'
          : 'এই দিকের কোনো ট্রেনের সাপ্তাহিক বন্ধ নেই।') +
        (daily.length && off.length ? ` ${trainNames(daily)} প্রতিদিন চলে।` : ''),
    },
  ];
}

function departureItems(legs: Leg[]): DepartureItem[] {
  return legs.map((l) => ({
    key: l.train.id,
    label: `${l.train.name} (${toBnDigits(l.train.number ?? '')})`,
    time: l.dep,
    offDay: l.train.offDay,
    dep0: toMinutes(l.train.departure),
    offset: l.from.depOffset ?? 0,
  }));
}

export default async function RoutePage({ params }: Props) {
  const r = findRoute((await params).slug);
  if (!r) notFound();
  const a = stationName(r.from);
  const b = stationName(r.to);
  const fwd = legsBetween(r.from, r.to);
  const rev = legsBetween(r.to, r.from);
  const all = [...fwd, ...rev];
  const unverified = all.some((l) => !l.train.verified);
  const fastest = [...fwd].sort((x, y) => x.duration - y.duration)[0];
  const faqs = [...directionFaqs(fwd, a, b), ...directionFaqs(rev, b, a), ...(r.faqs ?? [])];
  const related = publishedRoutes().filter(
    (x) => x !== r && [x.from, x.to].some((s) => s === r.from || s === r.to),
  );
  const path = `/route/${routeSlug(r)}/`;

  return (
    <div className="container-page py-8">
      <Breadcrumbs
        items={[
          { name: 'রুট', path: '/routes/' },
          { name: `${a}–${b}`, path },
        ]}
      />
      <h1 className="text-2xl leading-snug font-bold sm:text-3xl">
        {a} থেকে {b} ট্রেনের সময়সূচী
      </h1>
      <p className="mt-2 text-slate-600">
        ফিরতি পথ: {b} থেকে {a} — একই পাতায় নিচে
      </p>

      <div className="mt-6 space-y-4 text-[1.05rem] text-slate-800">
        {r.intro.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="এক নজরে">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-600">এক নজরে</h2>
          <ul className="mt-2 space-y-1">
            <li>
              {a} → {b}: <strong>{toBnDigits(fwd.length)}টি</strong> ট্রেন
            </li>
            <li>
              {b} → {a}: <strong>{toBnDigits(rev.length)}টি</strong> ট্রেন
            </li>
            {fastest && (
              <li>
                সবচেয়ে দ্রুত: {fastest.train.name} ({formatDurationBn(fastest.duration)})
              </li>
            )}
          </ul>
        </div>
        <NextDepartures title={`${a} থেকে ${b} পরবর্তী ট্রেন`} items={departureItems(fwd)} />
      </section>

      <AdSlot id="route-top" />

      <section id="forward" className="mt-10 scroll-mt-4">
        <h2 className="mb-3 text-xl font-bold">
          {a} → {b}
        </h2>
        <LegTable legs={fwd} fromName={a} toName={b} />
      </section>

      <section id="reverse" className="mt-10 scroll-mt-4">
        <h2 className="mb-3 text-xl font-bold">
          {b} → {a}
        </h2>
        <LegTable legs={rev} fromName={b} toName={a} />
      </section>
      <p className="mt-3 text-sm text-slate-600">
        সময় ১২ ঘণ্টার হিসাবে দেখানো হয়েছে; সময়ের ওপর মাউস রাখলে বা চাপ দিলে রেলওয়ের ২৪ ঘণ্টার
        সময় দেখা যায়। “আজ বন্ধ” চিহ্ন বাংলাদেশ সময় অনুযায়ী আজকের বার দেখে বসানো হয়।
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-bold">ভাড়া</h2>
        <p className="mt-3">
          উৎস নথিতে ভাড়ার তালিকা নেই, তাই এখানে কোনো অঙ্ক দেখানো হচ্ছে না। আসনের শ্রেণি (যেমন শোভন
          চেয়ার, স্নিগ্ধা, এসি সিট বা এসি বার্থ) এবং দূরত্ব অনুযায়ী ভাড়া আলাদা হয়। সঠিক ভাড়া
          জানতে{' '}
          <a href={SITE.officialTicketUrl} rel="noopener" target="_blank">
            বাংলাদেশ রেলওয়ের অফিসিয়াল ই-টিকিট সাইটে
          </a>{' '}
          যাত্রার তারিখ ও স্টেশন দিয়ে খুঁজুন। আসনের শ্রেণিগুলোর পার্থক্য জানতে দেখুন{' '}
          <Link href="/guides/online-ticket/">অনলাইনে টিকিট কাটার গাইড</Link>।
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">যাত্রার আগে কিছু পরামর্শ</h2>
        <ul className="mt-3 list-disc space-y-2 ps-6">
          {r.tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </section>

      <AdSlot id="route-mid" />

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

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">সম্পর্কিত রুট</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {related.map((x) => (
              <li key={routeSlug(x)}>
                <Link
                  href={`/route/${routeSlug(x)}/`}
                  className="hover:border-brand-400 inline-block rounded-full border border-slate-300 bg-white px-3 py-1.5 no-underline"
                >
                  {stationName(x.from)}–{stationName(x.to)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DataNotice unverified={unverified} />
      <JsonLd data={faqSchema(faqs)} />
      <TodayEnhancer />
    </div>
  );
}
