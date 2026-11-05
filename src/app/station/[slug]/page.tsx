import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdSlot } from '@/components/AdSlot';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { NextDepartures, type DepartureItem } from '@/components/live/NextDepartures';
import { TodayEnhancer } from '@/components/live/TodayEnhancer';
import { DataNotice, OffDay, T, TodayOffBadge, TrainLabel, TypeBadge } from '@/components/ui';
import { publishedRoutes, routeSlug } from '@/content/validate-routes';
import { toBnDigits } from '@/lib/bn';
import { TYPE_LABEL, servicesAt, station, stationName, stationPages } from '@/lib/data';
import { pageMetadata } from '@/lib/seo';
import { toMinutes } from '@/lib/time';
import type { TrainType } from '@/lib/types';

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;

export function generateStaticParams() {
  return stationPages().map((p) => ({ slug: p.station.id }));
}

const label = (id: string) => {
  const s = station(id);
  return s.note ? `${s.bn} (${s.note.replace(' রেলওয়ে স্টেশন', '')})` : s.bn;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!stationPages().some((p) => p.station.id === slug)) return {};
  const n = servicesAt(slug).length;
  return pageMetadata({
    title: `${label(slug)} রেলওয়ে স্টেশন: ট্রেনের সময়সূচী`,
    description: `${stationName(slug)} স্টেশনে থামা ও এখান থেকে ছাড়া ${toBnDigits(n)}টি ট্রেনের পৌঁছা-ছাড়ার সময়, গন্তব্য ও সাপ্তাহিক বন্ধ — বাংলাদেশ রেলওয়ের সময়সূচী অনুযায়ী।`,
    path: `/station/${slug}/`,
  });
}

export default async function StationPage({ params }: Props) {
  const { slug } = await params;
  if (!stationPages().some((p) => p.station.id === slug)) notFound();
  const name = stationName(slug);
  const services = servicesAt(slug);
  const byType = new Map<TrainType, number>();
  for (const s of services) byType.set(s.train.type, (byType.get(s.train.type) ?? 0) + 1);
  const starting = services.filter((s) => s.role === 'origin').length;
  const ending = services.filter((s) => s.role === 'destination').length;
  const destinations = [
    ...new Set(services.filter((s) => s.role !== 'destination').map((s) => s.train.destination)),
  ].filter((d) => d !== slug);
  const typeSummary = [...byType.entries()]
    .map(([t, n]) => `${toBnDigits(n)}টি ${TYPE_LABEL[t]}`)
    .join(', ');
  const items: DepartureItem[] = services
    .filter((s) => s.stop.dep)
    .map((s) => ({
      key: s.train.id,
      label: `${s.train.name} → ${stationName(s.train.destination)}`,
      time: s.stop.dep!,
      offDay: s.train.offDay,
      dep0: toMinutes(s.train.departure),
      offset: s.stop.depOffset ?? 0,
    }));
  const routes = publishedRoutes().filter((r) => r.from === slug || r.to === slug);
  const path = `/station/${slug}/`;

  return (
    <div className="container-page py-8">
      <Breadcrumbs
        items={[
          { name: 'স্টেশন', path: '/stations/' },
          { name, path },
        ]}
      />
      <h1 className="text-2xl leading-snug font-bold sm:text-3xl">
        {label(slug)} রেলওয়ে স্টেশন: ট্রেনের সময়সূচী
      </h1>

      <div className="mt-6 space-y-3 text-[1.05rem] text-slate-800">
        <p>
          এই সাইটের সময়সূচী অনুযায়ী {name} স্টেশনে মোট {toBnDigits(services.length)}টি ট্রেনের
          সময় পাওয়া যায় — এর মধ্যে {typeSummary}।{' '}
          {starting > 0 && `${toBnDigits(starting)}টি ট্রেনের যাত্রা এখান থেকেই শুরু হয়`}
          {starting > 0 && ending > 0 && ' এবং '}
          {ending > 0 && `${toBnDigits(ending)}টির যাত্রা এখানে শেষ হয়`}
          {(starting > 0 || ending > 0) && '।'}
        </p>
        {destinations.length > 0 && (
          <p>
            এখান থেকে সরাসরি ট্রেনে যাওয়া যায়{' '}
            {destinations.slice(0, 12).map(stationName).join(', ')}
            {destinations.length > 12 ? ' সহ আরও কয়েকটি গন্তব্যে' : ''}। নিচের টেবিলে ট্রেনগুলো এই
            স্টেশনে পৌঁছানো বা ছাড়ার সময় অনুযায়ী সাজানো।
          </p>
        )}
      </div>

      <div className="mt-6 max-w-xl">
        <NextDepartures title={`${name} থেকে পরবর্তী ছাড়ার সময়`} items={items} limit={3} />
      </div>

      <AdSlot id="station-top" />

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">{name} স্টেশনের সব ট্রেন</h2>
        <div className="tt-wrap">
          <table className="tt">
            <thead>
              <tr>
                <th scope="col">ট্রেন</th>
                <th scope="col">কোথা থেকে → কোথায়</th>
                <th scope="col">পৌঁছায়</th>
                <th scope="col">ছাড়ে</th>
                <th scope="col">বন্ধ</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.train.id} data-offday={s.offDay ?? undefined}>
                  <td className="min-w-44">
                    <TrainLabel train={s.train} />
                    <span className="ms-1.5">
                      <TypeBadge type={s.train.type} />
                    </span>
                  </td>
                  <td className="min-w-40 text-[0.95rem]">
                    {stationName(s.train.origin)} → {stationName(s.train.destination)}
                  </td>
                  <td>
                    {s.role === 'origin' ? (
                      <span className="text-sm text-slate-500">শুরু</span>
                    ) : (
                      <T t={s.stop.arr} />
                    )}
                  </td>
                  <td>
                    {s.role === 'destination' ? (
                      <span className="text-sm text-slate-500">শেষ</span>
                    ) : (
                      <T t={s.stop.dep} />
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    <OffDay day={s.offDay} />
                    <TodayOffBadge />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          “বন্ধ” কলামে দেখানো হয়েছে কোন বারে ট্রেনটি এই স্টেশনে আসে না। মধ্যরাতের পরে এই স্টেশনে
          পৌঁছানো ট্রেনের ক্ষেত্রে বারটি সেই অনুযায়ী পরের দিনে সরানো হয়েছে।
        </p>
      </section>

      {routes.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">{name} থেকে জনপ্রিয় রুট</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {routes.map((r) => (
              <li key={routeSlug(r)}>
                <Link
                  href={`/route/${routeSlug(r)}/`}
                  className="hover:border-brand-400 inline-block rounded-full border border-slate-300 bg-white px-3 py-1.5 no-underline"
                >
                  {stationName(r.from)}–{stationName(r.to)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DataNotice unverified={services.some((s) => !s.train.verified)} />
      <TodayEnhancer />
    </div>
  );
}
