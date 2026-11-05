import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageHeader } from '@/components/ui';
import { NOTICES } from '@/content/notices';
import { formatDateBn } from '@/lib/bn';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'নোটিশ ও হালনাগাদ: ট্রেনের তথ্যে পরিবর্তন',
  description:
    'সময়সূচীতে নতুন তথ্য যুক্ত হওয়া, উৎস নথিতে পাওয়া অসঙ্গতি ও সংশোধন এবং যেসব ট্রেন আপাতত দেখানো হচ্ছে না — সবকিছুর হালনাগাদ এক জায়গায়।',
  path: '/notices/',
});

export default function NoticesPage() {
  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ name: 'নোটিশ', path: '/notices/' }]} />
      <PageHeader
        title="নোটিশ ও হালনাগাদ"
        lead="সাইটের তথ্যে কী যোগ হলো, কী বদলাল এবং উৎস নথির কোন অসঙ্গতি কীভাবে সামলানো হয়েছে — সব এখানে লিখে রাখা হয়।"
      />
      <ol className="space-y-6">
        {NOTICES.map((n) => (
          <li key={n.id} id={n.id} className="card scroll-mt-4 p-5">
            <p className="text-sm text-slate-600">
              <time dateTime={n.date}>{formatDateBn(n.date)}</time>
            </p>
            <h2 className="mt-1 text-lg font-bold">{n.title}</h2>
            <div className="mt-2 space-y-2 text-slate-800">
              {n.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
