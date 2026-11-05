import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageHeader } from '@/components/ui';
import { GUIDES } from '@/content/guides';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'ট্রেনযাত্রার গাইড: টিকিট, ফেরত, ঈদ, মালপত্র ও সময়সূচী',
  description:
    'অনলাইনে টিকিট কাটা, এনআইডি দিয়ে নিবন্ধন, টিকিট ফেরত, ঈদের টিকিট, শিশুদের টিকিট, মালপত্রের নিয়ম এবং সময়সূচী পড়ার সহজ বাংলা গাইড।',
  path: '/guides/',
});

export default function GuidesPage() {
  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ name: 'গাইড', path: '/guides/' }]} />
      <PageHeader
        title="ট্রেনযাত্রার গাইড"
        lead="টিকিট কাটা থেকে যাত্রার দিন পর্যন্ত যা যা জানা দরকার, তা সহজ বাংলায় সাজানো। যেসব নিয়ম রেলওয়ে সময় সময় বদলায়, সেগুলোর ক্ষেত্রে অফিসিয়াল সূত্রে মিলিয়ে নেওয়ার কথা স্পষ্ট করে বলা আছে।"
      />
      <ul className="grid gap-4 sm:grid-cols-2">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/guides/${g.slug}/`}
              className="card hover:border-brand-400 block h-full p-5 no-underline hover:no-underline"
            >
              <span className="text-lg font-semibold text-slate-900">{g.title}</span>
              <span className="mt-2 block text-[0.95rem] text-slate-700">{g.short}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
