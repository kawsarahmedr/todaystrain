import { Breadcrumbs } from '@/components/Breadcrumbs';
import { RouteSearchForm } from '@/components/RouteSearchForm';
import { SearchResults } from '@/components/SearchResults';
import { DataNotice, PageHeader } from '@/components/ui';
import { publishedRoutes, routeSlug } from '@/content/validate-routes';
import { searchStations } from '@/lib/search-stations';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'দুই স্টেশনের মধ্যে ট্রেন খুঁজুন',
  description:
    'যেকোনো দুটি স্টেশন বেছে নিয়ে তাদের মধ্যে চলা সরাসরি ট্রেনের সময়, যাত্রাকাল ও সাপ্তাহিক বন্ধ দেখুন।',
  path: '/search/',
  noindex: true,
});

export default function SearchPage() {
  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ name: 'ট্রেন খুঁজুন', path: '/search/' }]} />
      <PageHeader
        title="দুই স্টেশনের মধ্যে ট্রেন খুঁজুন"
        lead="যাত্রা শুরুর ও গন্তব্যের স্টেশন বেছে নিন। ফলাফলে সেই দুই স্টেশনের মধ্যে সরাসরি চলা ট্রেনগুলো সময় অনুযায়ী দেখাবে।"
      />
      <RouteSearchForm
        stations={searchStations()}
        routes={publishedRoutes().map((r) => ({ slug: routeSlug(r), from: r.from, to: r.to }))}
      />
      <div className="mt-8">
        <SearchResults />
      </div>
      <p className="mt-6 text-sm text-slate-600">
        খোঁজার কাজটি আপনার ব্রাউজারেই হয়; কোনো তথ্য আমাদের সার্ভারে পাঠানো হয় না। ফলাফল বাংলাদেশ
        রেলওয়ের সময়সূচীর ওপর ভিত্তি করে, তবে পূর্বাঞ্চলের মাঝের স্টেশনগুলোর সময় এখনো যুক্ত হয়নি।
      </p>
      <DataNotice />
    </div>
  );
}
