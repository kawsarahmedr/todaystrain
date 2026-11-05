import Link from 'next/link';
import { AdSlot } from '@/components/AdSlot';
import { JsonLd } from '@/components/JsonLd';
import { LiveClock } from '@/components/live/LiveClock';
import { TodayEnhancer } from '@/components/live/TodayEnhancer';
import { RouteSearchForm } from '@/components/RouteSearchForm';
import { TodayOffList } from '@/components/TodayOffList';
import { DataNotice } from '@/components/ui';
import { NOTICES } from '@/content/notices';
import { publishedRoutes, routeSlug } from '@/content/validate-routes';
import { formatDateBn, formatDurationBn, toBnDigits } from '@/lib/bn';
import { activeTrains, legsBetween, stationName, stationPages, trainGroups } from '@/lib/data';
import { searchStations } from '@/lib/search-stations';
import { organizationSchema, pageMetadata, websiteSchema } from '@/lib/seo';
import { SITE } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'ট্রেনের সময়সূচী, বন্ধের দিন ও রুট | TodaysTrain',
  absoluteTitle: true,
  description: SITE.description,
  path: '/',
});

export default function HomePage() {
  const trains = activeTrains();
  const intercity = trains.filter((t) => t.type === 'intercity');
  const routes = publishedRoutes();
  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="container-page py-8 sm:py-10">
          <h1 className="text-2xl leading-snug font-bold sm:text-4xl">
            বাংলাদেশের ট্রেনের সময়সূচী
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-slate-700">
            আন্তঃনগর, মেইল ও কমিউটার ট্রেন কখন ছাড়ে, কখন পৌঁছায় আর কোন দিন বন্ধ — বাংলাদেশ
            রেলওয়ের প্রকাশিত সময়সূচী থেকে সাজানো, সহজ বাংলায়।
          </p>
          <LiveClock className="mt-3 text-slate-700" />
          <div className="mt-5">
            <RouteSearchForm
              stations={searchStations()}
              routes={routes.map((r) => ({ slug: routeSlug(r), from: r.from, to: r.to }))}
            />
          </div>
        </div>
      </section>

      <div className="container-page space-y-14 py-10">
        <TodayOffList trains={intercity} />

        <section aria-labelledby="popular-routes">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="popular-routes" className="text-xl font-bold">
              জনপ্রিয় রুট
            </h2>
            <Link href="/routes/" className="text-sm">
              সব রুট
            </Link>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {routes.map((r) => {
              const legs = [...legsBetween(r.from, r.to), ...legsBetween(r.to, r.from)];
              const fastest = [...legs].sort((a, b) => a.duration - b.duration)[0];
              return (
                <li key={routeSlug(r)}>
                  <Link
                    href={`/route/${routeSlug(r)}/`}
                    className="card hover:border-brand-400 block h-full p-4 no-underline hover:no-underline"
                  >
                    <span className="font-semibold text-slate-900">
                      {stationName(r.from)} ⇄ {stationName(r.to)}
                    </span>
                    <span className="mt-1 block text-sm text-slate-600">
                      {toBnDigits(legs.length)}টি ট্রেন (দুই দিক মিলিয়ে)
                      {fastest && ` · দ্রুততম ${formatDurationBn(fastest.duration)}`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <AdSlot id="home-mid" />

        <section aria-labelledby="major-stations">
          <h2 id="major-stations" className="text-xl font-bold">
            প্রধান স্টেশন
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {stationPages()
              .slice(0, 18)
              .map(({ station }) => (
                <li key={station.id}>
                  <Link
                    href={`/station/${station.id}/`}
                    className="hover:border-brand-400 inline-block rounded-full border border-slate-300 bg-white px-3 py-1.5 no-underline"
                  >
                    {station.bn}
                  </Link>
                </li>
              ))}
            <li>
              <Link href="/stations/" className="inline-block px-3 py-1.5">
                সব স্টেশন →
              </Link>
            </li>
          </ul>
        </section>

        <section aria-labelledby="latest-notices">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="latest-notices" className="text-xl font-bold">
              সর্বশেষ নোটিশ
            </h2>
            <Link href="/notices/" className="text-sm">
              সব নোটিশ
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {NOTICES.slice(0, 3).map((n) => (
              <li key={n.id} className="card p-4">
                <p className="text-sm text-slate-600">{formatDateBn(n.date)}</p>
                <Link href={`/notices/#${n.id}`} className="mt-1 block font-semibold">
                  {n.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="prose-bn" aria-labelledby="about-site">
          <h2 id="about-site">TodaysTrain কেন</h2>
          <p>
            ট্রেনের সময় জানতে অনেক সময় বড় পিডিএফ ঘাঁটতে হয়, আর ছোট ছোট সংখ্যার ভিড়ে দরকারি
            তথ্যটি খুঁজে পাওয়া কঠিন হয়ে পড়ে। এখানে বাংলাদেশ রেলওয়ের প্রকাশিত সময়সূচী থেকে{' '}
            {toBnDigits(trains.length)}টি ট্রেনের তথ্য রুট, ট্রেন ও স্টেশন অনুযায়ী আলাদা করে সাজানো
            হয়েছে; এর মধ্যে {toBnDigits(trainGroups().length)}টি আন্তঃনগর ট্রেনের প্রতিটি স্টেশনের
            সময়ও আছে। সময় দেখানো হয় সহজ ১২ ঘণ্টার হিসাবে, আর বাংলাদেশ সময় অনুযায়ী আজ কোন ট্রেন
            বন্ধ বা পরবর্তী ট্রেন কখন, তা আলাদা করে চিহ্নিত থাকে।
          </p>
          <p>
            আমরা কোনো তথ্য আন্দাজে বসাই না। উৎস নথিতে যা নেই — যেমন ভাড়া বা কোনো স্টেশনের সময় — তা
            খালি রাখা হয় এবং স্পষ্ট করে জানানো হয়। স্ক্যান করা নথি থেকে হাতে তোলা তথ্যও আলাদা
            চিহ্নে দেখানো হয়। TodaysTrain একটি স্বাধীন উদ্যোগ, বাংলাদেশ রেলওয়ের অফিসিয়াল সাইট
            নয়; তাই টিকিট কাটার আগে অফিসিয়াল সূত্রে তথ্য মিলিয়ে নিন।{' '}
            <Link href="/about/">আমাদের সম্পর্কে আরও জানুন</Link>।
          </p>
        </section>

        <DataNotice unverified={trains.some((t) => !t.verified)} />
      </div>
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
      <TodayEnhancer />
    </>
  );
}
