export const SITE = {
  name: 'TodaysTrain',
  domain: 'todaystrain.com',
  url: 'https://todaystrain.com',
  titleDefault: 'ট্রেনের সময়সূচী ও বন্ধের দিন | TodaysTrain',
  description:
    'বাংলাদেশের আন্তঃনগর, মেইল ও কমিউটার ট্রেনের সময়সূচী, সাপ্তাহিক বন্ধের দিন, রুট ও স্টেশনভিত্তিক তথ্য এবং টিকিট কাটার সহজ গাইড — সম্পূর্ণ বাংলায়।',
  // TODO-VERIFY: confirm the public support address before launch.
  supportEmail: 'support@todaystrain.com',
  locale: 'bn_BD',
  // Official Bangladesh Railway channels (we are NOT affiliated with them).
  officialTicketUrl: 'https://eticket.railway.gov.bd/',
  officialRailwayUrl: 'https://railway.gov.bd/',
} as const;

export const NAV: { href: string; label: string }[] = [
  { href: '/', label: 'হোম' },
  { href: '/trains/', label: 'ট্রেন' },
  { href: '/routes/', label: 'রুট' },
  { href: '/stations/', label: 'স্টেশন' },
  { href: '/today/', label: 'আজকের ট্রেন' },
  { href: '/guides/', label: 'গাইড' },
  { href: '/notices/', label: 'নোটিশ' },
];

export const FOOTER_LINKS: { href: string; label: string }[] = [
  { href: '/about/', label: 'আমাদের সম্পর্কে' },
  { href: '/contact/', label: 'যোগাযোগ' },
  { href: '/privacy-policy/', label: 'গোপনীয়তা নীতি' },
  { href: '/terms/', label: 'ব্যবহারের শর্তাবলি' },
  { href: '/disclaimer/', label: 'দায়মুক্তি' },
];

export function absoluteUrl(path: string): string {
  return new URL(path, SITE.url).toString();
}
