import Link from 'next/link';
import { FOOTER_LINKS, NAV, SITE } from '@/lib/site';
import { toBnDigits } from '@/lib/bn';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="container-page grid gap-8 py-10 text-[0.95rem] sm:grid-cols-3">
        <div>
          <p className="font-bold text-slate-900">TodaysTrain.com</p>
          <p className="mt-2 text-slate-600">
            বাংলাদেশ রেলওয়ের প্রকাশিত সময়সূচীর ভিত্তিতে সাজানো একটি স্বাধীন তথ্যসেবা। এটি বাংলাদেশ
            রেলওয়ের অফিসিয়াল ওয়েবসাইট নয় এবং রেলওয়ের সঙ্গে আমাদের কোনো সম্পর্ক নেই।
          </p>
        </div>
        <nav aria-label="সাইট লিংক">
          <p className="font-semibold text-slate-900">দ্রুত লিংক</p>
          <ul className="mt-2 space-y-1">
            {NAV.slice(1).map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="নীতিমালা">
          <p className="font-semibold text-slate-900">তথ্য ও নীতিমালা</p>
          <ul className="mt-2 space-y-1">
            {FOOTER_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-slate-200">
        <p className="container-page py-4 text-sm text-slate-600">
          © {toBnDigits(new Date().getFullYear())} {SITE.name}। টিকিট কাটার আগে সময়সূচী অবশ্যই{' '}
          <a href={SITE.officialTicketUrl} rel="noopener" target="_blank">
            অফিসিয়াল ই-টিকিট সাইটে
          </a>{' '}
          মিলিয়ে নিন।
        </p>
      </div>
    </footer>
  );
}
