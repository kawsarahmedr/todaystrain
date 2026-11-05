import Link from 'next/link';
import { NAV } from '@/lib/site';

function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 text-slate-900 no-underline hover:no-underline"
    >
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#1b5476" />
        <path
          d="M10 7h12a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3Zm0 3v4h12v-4H10Zm1 7.5a1.5 1.5 0 1 0 0 .01Zm10 0a1.5 1.5 0 1 0 0 .01ZM11 23l-2 3h3l1.5-2h5l1.5 2h3l-2-3h-10Z"
          fill="#fff"
        />
      </svg>
      <span className="text-lg font-bold tracking-tight">
        TodaysTrain<span className="text-brand-600">.com</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="container-page flex h-14 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="প্রধান মেনু" className="hidden md:block">
          <ul className="flex items-center gap-1 text-[0.95rem]">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-md px-2.5 py-1.5 text-slate-700 no-underline hover:bg-slate-100 hover:text-slate-900 hover:no-underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* Mobile menu: native <details>, no JavaScript needed */}
        <details className="group relative md:hidden">
          <summary className="flex h-10 cursor-pointer list-none items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-800 [&::-webkit-details-marker]:hidden">
            মেনু
          </summary>
          <nav
            aria-label="মোবাইল মেনু"
            className="absolute right-0 z-40 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
          >
            <ul>
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-md px-3 py-2.5 text-slate-800 no-underline hover:bg-slate-100 hover:no-underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      </div>
    </header>
  );
}
