import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { TodayEnhancer } from '@/components/live/TodayEnhancer';
import { TrainTable } from '@/components/TrainTable';
import { DataNotice, PageHeader } from '@/components/ui';
import { toBnDigits } from '@/lib/bn';
import { activeTrains } from '@/lib/data';
import { pageMetadata } from '@/lib/seo';
import { TRAIN_TYPE_PAGES } from '@/lib/train-types';

type Props = { params: Promise<{ type: string }> };
export const dynamicParams = false;

export function generateStaticParams() {
  return TRAIN_TYPE_PAGES.map((p) => ({ type: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  const p = TRAIN_TYPE_PAGES.find((x) => x.slug === type);
  if (!p) return {};
  const n = activeTrains().filter((t) => p.types.includes(t.type)).length;
  return pageMetadata({
    title: `${p.title}: সময়সূচী ও বন্ধের দিন`,
    description: `${toBnDigits(n)}টি ট্রেনের নম্বর, রুট, ছাড়া-পৌঁছার সময় ও সাপ্তাহিক বন্ধ — বাংলাদেশ রেলওয়ের সময়সূচী অনুযায়ী।`,
    path: `/trains/${p.slug}/`,
  });
}

export default async function TrainTypePage({ params }: Props) {
  const { type } = await params;
  const p = TRAIN_TYPE_PAGES.find((x) => x.slug === type);
  if (!p) notFound();
  const trains = activeTrains().filter((t) => p.types.includes(t.type));
  return (
    <div className="container-page py-8">
      <Breadcrumbs
        items={[
          { name: 'ট্রেন', path: '/trains/' },
          { name: p.title, path: `/trains/${p.slug}/` },
        ]}
      />
      <PageHeader title={`${p.title} (${toBnDigits(trains.length)}টি)`} lead={p.lead} />
      <TrainTable trains={trains} />
      <p className="mt-6 text-slate-700">
        অন্যান্য তালিকা: <Link href="/trains/">আন্তঃনগর ট্রেন</Link>
        {TRAIN_TYPE_PAGES.filter((x) => x.slug !== p.slug).map((x) => (
          <span key={x.slug}>
            {' · '}
            <Link href={`/trains/${x.slug}/`}>{x.title.replace('র তালিকা', '')}</Link>
          </span>
        ))}
      </p>
      <DataNotice unverified={trains.some((t) => !t.verified)} />
      <TodayEnhancer />
    </div>
  );
}
