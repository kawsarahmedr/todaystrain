import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { DataNotice, PageHeader } from '@/components/ui';
import { publishedRoutes, routeSlug } from '@/content/validate-routes';
import { formatDurationBn, toBnDigits } from '@/lib/bn';
import { legsBetween, stationName } from '@/lib/data';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'জনপ্রিয় ট্রেন রুট: ঢাকা, চট্টগ্রাম, রাজশাহী, খুলনা ও সিলেট',
  description:
    'দেশের জনপ্রিয় রেলপথগুলোর ট্রেন সংখ্যা, সবচেয়ে দ্রুত ট্রেন, যাওয়া-আসার সময়সূচী ও সাপ্তাহিক বন্ধ — প্রতিটি রুটের আলাদা পাতায়।',
  path: '/routes/',
});

export default function RoutesPage() {
  const routes = publishedRoutes();
  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ name: 'রুট', path: '/routes/' }]} />
      <PageHeader
        title="জনপ্রিয় ট্রেন রুট"
        lead="প্রতিটি রুটের পাতায় দুই দিকের সব সরাসরি ট্রেন, যাত্রাকাল, সাপ্তাহিক বন্ধ এবং সেই পথের জন্য আলাদা পরামর্শ দেওয়া আছে।"
      />
      <ul className="grid gap-4 sm:grid-cols-2">
        {routes.map((r) => {
          const fwd = legsBetween(r.from, r.to);
          const rev = legsBetween(r.to, r.from);
          const fastest = [...fwd, ...rev].sort((a, b) => a.duration - b.duration)[0];
          return (
            <li key={routeSlug(r)}>
              <Link
                href={`/route/${routeSlug(r)}/`}
                className="card hover:border-brand-400 block h-full p-5 no-underline hover:no-underline"
              >
                <span className="text-lg font-semibold text-slate-900">
                  {stationName(r.from)} ⇄ {stationName(r.to)}
                </span>
                <span className="mt-2 block text-[0.95rem] text-slate-700">
                  যাওয়া {toBnDigits(fwd.length)}টি · ফেরা {toBnDigits(rev.length)}টি ট্রেন
                  {fastest && ` · দ্রুততম ${formatDurationBn(fastest.duration)}`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-8 text-slate-700">
        তালিকায় আপনার রুট নেই? হোমপেজের সার্চ থেকে যেকোনো দুটি স্টেশন বেছে নিলে সেই পথের সরাসরি
        ট্রেনগুলো দেখা যাবে।
      </p>
      <DataNotice />
    </div>
  );
}
