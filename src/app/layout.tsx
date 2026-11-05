import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { ConsentNotice } from '@/components/ConsentNotice';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SITE } from '@/lib/site';
import './globals.css';

// Self-hosted Noto Sans Bengali (variable, Bengali subset) — no Google Fonts request at runtime.
const notoBengali = localFont({
  src: '../fonts/NotoSansBengali-Variable-bengali.woff2',
  variable: '--font-bn',
  weight: '100 900',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.titleDefault, template: '%s | TodaysTrain' },
  description: SITE.description,
  applicationName: SITE.name,
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1b5476',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bn" className={notoBengali.variable}>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="skip-link">
          মূল অংশে যান
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <ConsentNotice />
      </body>
    </html>
  );
}
