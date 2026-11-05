import type { Metadata } from 'next';
import { SITE, absoluteUrl } from './site';

/** Per-page metadata with a self-referencing canonical URL (paths end with "/"). */
export function pageMetadata(opts: {
  title: string;
  /** use the title as-is (no " | TodaysTrain" suffix) */
  absoluteTitle?: boolean;
  description: string;
  path: string;
  noindex?: boolean;
  type?: 'website' | 'article';
}): Metadata {
  const url = absoluteUrl(opts.path);
  return {
    title: opts.absoluteTitle ? { absolute: opts.title } : opts.title,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      type: opts.type ?? 'website',
      locale: SITE.locale,
      siteName: SITE.name,
      url,
      title: opts.title,
      description: opts.description,
      images: [{ url: absoluteUrl('/og.png'), width: 1200, height: 630, alt: SITE.name }],
    },
    twitter: { card: 'summary_large_image', title: opts.title, description: opts.description },
    robots: opts.noindex ? { index: false, follow: true } : undefined,
  };
}

export type Crumb = { name: string; path: string };

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.url,
    logo: absoluteUrl('/logo.png'),
    email: SITE.supportEmail,
    description: SITE.description,
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    inLanguage: 'bn',
  };
}

/** Only for real, visible question/answer pairs on the page. */
export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}
