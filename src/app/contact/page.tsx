import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ContactForm } from '@/components/ContactForm';
import { pageMetadata } from '@/lib/seo';
import { SITE } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'যোগাযোগ',
  description:
    'সময়সূচীতে ভুল চোখে পড়লে, নতুন রুট বা স্টেশন যোগ করার অনুরোধ জানাতে কিংবা পরামর্শ দিতে TodaysTrain-এর সঙ্গে যোগাযোগ করুন।',
  path: '/contact/',
});

export default function ContactPage() {
  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ name: 'যোগাযোগ', path: '/contact/' }]} />
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl leading-snug font-bold sm:text-3xl">যোগাযোগ</h1>
        <div className="prose-bn mt-4">
          <p>
            সময়সূচীতে কোনো ভুল চোখে পড়েছে, নতুন রুট বা স্টেশনের পাতা চান, কিংবা সাইটটি আরও কাজের
            করার পরামর্শ আছে? নিচের ফর্মে লিখুন অথবা সরাসরি ইমেইল করুন{' '}
            <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> ঠিকানায়। ভুল জানালে কোন
            ট্রেন, কোন স্টেশন ও কোন সময়ের কথা বলছেন তা উল্লেখ করলে যাচাই করা সহজ হয়।
          </p>
          <p className="note">
            আমরা বাংলাদেশ রেলওয়ে নই। টিকিট কেনা, টিকিট ফেরত, পেমেন্ট বা রেলওয়ের কোনো সেবা নিয়ে
            সমস্যার সমাধান আমরা করতে পারি না — এসব বিষয়ে রেলওয়ের{' '}
            <a href={SITE.officialTicketUrl} rel="noopener" target="_blank">
              অফিসিয়াল ই-টিকিট সাইট
            </a>{' '}
            বা সংশ্লিষ্ট স্টেশনে যোগাযোগ করুন।
          </p>
        </div>
        <div className="mt-6">
          <ContactForm supportEmail={SITE.supportEmail} />
        </div>
        <p className="mt-4 text-sm text-slate-600">
          ফর্মের তথ্য কেবল আপনার বার্তার উত্তর দিতে ব্যবহার করা হয়। বিস্তারিত দেখুন{' '}
          <Link href="/privacy-policy/">গোপনীয়তা নীতি</Link>।
        </p>
      </div>
    </div>
  );
}
