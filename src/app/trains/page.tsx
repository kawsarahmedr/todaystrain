import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { TodayEnhancer } from '@/components/live/TodayEnhancer';
import { DataNotice, OffDay, PageHeader, T, TodayOffBadge, TrainLabel } from '@/components/ui';
import { toBnDigits } from '@/lib/bn';
import { TYPE_LABEL, activeTrains, stationName, trainGroups } from '@/lib/data';
import { pageMetadata } from '@/lib/seo';
import type { TrainType } from '@/lib/types';

export const metadata = pageMetadata({
  title: 'বাংলাদেশের সব ট্রেনের তালিকা: আন্তঃনগর, মেইল ও কমিউটার',
  description:
    'আন্তঃনগর, মেইল, কমিউটার ও লোকাল ট্রেনের নম্বর, রুট, ছাড়া-পৌঁছার সময় ও সাপ্তাহিক বন্ধের দিন এক তালিকায়। আন্তঃনগর ট্রেনের সম্পূর্ণ স্টেশনভিত্তিক সময়সূচীও দেখুন।',
  path: '/trains/',
});

const ORDER: TrainType[] = ['intercity', 'mail', 'commuter', 'shuttle', 'local'];

export default function TrainsPage() {
  const groups = trainGroups();
  const trains = activeTrains();
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

      {ORDER.map((type) => {
        const list = trains.filter((t) => t.type === type);
        if (list.length === 0) return null;
        return (
          <section key={type} className="mt-12" id={type}>
            <h2 className="mb-3 text-xl font-bold">
              {TYPE_LABEL[type]} ট্রেন ({toBnDigits(list.length)}টি)
            </h2>
            <div className="tt-wrap">
              <table className="tt">
                <thead>
                  <tr>
                    <th scope="col">ট্রেন</th>
                    <th scope="col">রুট</th>
                    <th scope="col">ছাড়ে</th>
                    <th scope="col">পৌঁছায়</th>
                    <th scope="col">সাপ্তাহিক বন্ধ</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => (
                    <tr key={t.id} data-offday={t.offDay ?? undefined}>
                      <td className="min-w-40">
                        <TrainLabel train={t} />
                      </td>
                      <td className="min-w-40 text-[0.95rem]">
                        {stationName(t.origin)} → {stationName(t.destination)}
                      </td>
                      <td>
                        <T t={t.departure} />
                      </td>
                      <td>
                        <T t={t.arrival} />
                      </td>
                      <td className="whitespace-nowrap">
                        <OffDay day={t.offDay} />
                        <TodayOffBadge />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <DataNotice unverified={trains.some((t) => !t.verified)} />
      <TodayEnhancer />
    </div>
  );
}
