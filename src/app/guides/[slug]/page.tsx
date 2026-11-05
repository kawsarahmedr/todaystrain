import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdSlot } from '@/components/AdSlot';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { GuideBody } from '@/components/GuideBody';
import { GUIDES, guideBySlug } from '@/content/guides';
import { formatDateBn } from '@/lib/bn';
import { pageMetadata } from '@/lib/seo';
import { SITE } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = guideBySlug((await params).slug);
  if (!g) return {};
  return pageMetadata({
    title: g.title,
    description: g.description,
    path: `/guides/${g.slug}/`,
    type: 'article',
  });
}

export default async function GuidePage({ params }: Props) {
  const g = guideBySlug((await params).slug);
  if (!g) notFound();
  const others = GUIDES.filter((x) => x.slug !== g.slug);
  const path = `/guides/${g.slug}/`;
  return (
    <div className="container-page py-8">
      <Breadcrumbs
        items={[
          { name: 'গাইড', path: '/guides/' },
          { name: g.title, path },
        ]}
      />
      <article className="mx-auto max-w-3xl">
        <h1 className="text-2xl leading-snug font-bold sm:text-3xl">{g.title}</h1>
        <p className="mt-3 text-lg text-slate-700">{g.short}</p>
        <p className="mt-2 text-sm text-slate-600">
          সর্বশেষ পর্যালোচনা: <time dateTime={g.updated}>{formatDateBn(g.updated)}</time>
        </p>
        <div className="mt-6">
          <GuideBody guide={g} />
        </div>
        <AdSlot id="guide-bottom" />
        <aside className="mt-10 rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
          এই গাইড সাধারণ তথ্যের জন্য লেখা। রেলওয়ের নিয়ম, সময়সীমা ও মাশুল সময় সময় বদলায়; টিকিট
          কাটা বা ফেরতের আগে{' '}
          <a href={SITE.officialTicketUrl} rel="noopener" target="_blank">
            অফিসিয়াল ই-টিকিট সাইট
          </a>{' '}
          ও{' '}
          <a href={SITE.officialRailwayUrl} rel="noopener" target="_blank">
            বাংলাদেশ রেলওয়ের ওয়েবসাইটে
          </a>{' '}
          সর্বশেষ নিয়ম দেখে নিন। কোনো তথ্য ভুল মনে হলে <Link href="/contact/">আমাদের জানান</Link>।
        </aside>
      </article>
      <section className="mx-auto mt-12 max-w-3xl">
        <h2 className="text-xl font-bold">আরও গাইড</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {others.map((o) => (
            <li key={o.slug}>
              <Link href={`/guides/${o.slug}/`}>{o.title}</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
