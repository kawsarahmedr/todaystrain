import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { DataNotice, PageHeader } from '@/components/ui';
import { toBnDigits } from '@/lib/bn';
import { MIN_STATION_TRAINS, stationPages } from '@/lib/data';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'প্রধান রেলস্টেশন: স্টেশনভিত্তিক ট্রেনের সময়সূচী',
  description:
    'ঢাকা, চট্টগ্রাম, রাজশাহী, খুলনা, ঈশ্বরদী, পার্বতীপুরসহ প্রধান রেলস্টেশনে কোন ট্রেন কখন পৌঁছায় ও ছাড়ে, তার স্টেশনভিত্তিক তালিকা।',
  path: '/stations/',
});

export default function StationsPage() {
  const pages = stationPages();
  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ name: 'স্টেশন', path: '/stations/' }]} />
      <PageHeader
        title="প্রধান রেলস্টেশন"
        lead={`যেসব স্টেশনে এই সময়সূচী অনুযায়ী অন্তত ${toBnDigits(MIN_STATION_TRAINS)}টি ট্রেনের সময় পাওয়া যায়, সেগুলোর আলাদা পাতা আছে। প্রতিটি পাতায় ট্রেনগুলো সময় অনুযায়ী সাজানো।`}
      />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map(({ station, count }) => (
          <li key={station.id}>
            <Link
              href={`/station/${station.id}/`}
              className="card hover:border-brand-400 flex items-center justify-between p-4 no-underline hover:no-underline"
            >
              <span className="font-semibold text-slate-900">{station.bn}</span>
              <span className="text-sm text-slate-600">{toBnDigits(count)}টি ট্রেন</span>
            </Link>
          </li>
        ))}
      </ul>
      <DataNotice />
    </div>
  );
}
