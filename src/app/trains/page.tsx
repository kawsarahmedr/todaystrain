import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { TodayEnhancer } from '@/components/live/TodayEnhancer';
import { TrainTable } from '@/components/TrainTable';
import { DataNotice, PageHeader } from '@/components/ui';
import { toBnDigits } from '@/lib/bn';
import { activeTrains, stationName, trainGroups } from '@/lib/data';
import { TRAIN_TYPE_PAGES } from '@/lib/train-types';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'বাংলাদেশের সব ট্রেনের তালিকা: আন্তঃনগর, মেইল ও কমিউটার',
  description:
    'আন্তঃনগর, মেইল, কমিউটার ও লোকাল ট্রেনের নম্বর, রুট, ছাড়া-পৌঁছার সময় ও সাপ্তাহিক বন্ধের দিন এক তালিকায়। আন্তঃনগর ট্রেনের সম্পূর্ণ স্টেশনভিত্তিক সময়সূচীও দেখুন।',
  path: '/trains/',
});

export default function TrainsPage() {
  const groups = trainGroups();
  const trains = activeTrains();
  const intercity = trains.filter((t) => t.type === 'intercity');
  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ name: 'ট্রেন', path: '/trains/' }]} />
      <PageHeader
        title="সব ট্রেনের তালিকা"
        lead={`বাংলাদেশ রেলওয়ের প্রকাশিত সময়সূচী থেকে সাজানো ${toBnDigits(trains.length)}টি ট্রেনের তালিকা। নাম বা নম্বরে চাপ দিলে আন্তঃনগর ট্রেনের সম্পূর্ণ সময়সূচী দেখা যাবে।`}
      />

      <section>
        <h2 className="text-xl font-bold">স্টেশনভিত্তিক সম্পূর্ণ সময়সূচী আছে যেসব ট্রেনের</h2>
        <p className="mt-2 text-slate-700">
          এই আন্তঃনগর ট্রেনগুলোর প্রতিটি বিরতির পৌঁছা ও ছাড়ার সময়, সাপ্তাহিক বন্ধ এবং সময়সূচী
          অনুযায়ী আনুমানিক অবস্থান আলাদা পাতায় দেওয়া আছে।
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/train/${g.slug}/`}
                className="card hover:border-brand-400 block h-full p-4 no-underline hover:no-underline"
              >
                <span className="font-semibold text-slate-900">{g.name}</span>
                <span className="text-slate-500">
                  {' '}
                  ({g.trains.map((t) => toBnDigits(t.number ?? '')).join('/')})
                </span>
                <span className="mt-1 block text-sm text-slate-600">
                  {stationName(g.trains[0]!.origin)} ⇄ {stationName(g.trains[0]!.destination)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" id="intercity">
        <h2 className="mb-3 text-xl font-bold">
          সব আন্তঃনগর ট্রেন ({toBnDigits(intercity.length)}টি)
        </h2>
        <TrainTable trains={intercity} />
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold">অন্যান্য ট্রেনের তালিকা</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {TRAIN_TYPE_PAGES.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/trains/${p.slug}/`}
                className="card hover:border-brand-400 block h-full p-4 no-underline hover:no-underline"
              >
                <span className="font-semibold text-slate-900">{p.title}</span>
                <span className="mt-1 block text-sm text-slate-600">
                  {toBnDigits(trains.filter((t) => p.types.includes(t.type)).length)}টি ট্রেন
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <DataNotice unverified={trains.some((t) => !t.verified)} />
      <TodayEnhancer />
    </div>
  );
}
