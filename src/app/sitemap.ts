import type { MetadataRoute } from 'next';
import { LEGAL_UPDATED } from '@/components/LegalPage';
import { GUIDES } from '@/content/guides';
import { NOTICES } from '@/content/notices';
import { publishedRoutes, routeSlug } from '@/content/validate-routes';
import { meta, stationPages, trainGroups } from '@/lib/data';
import { absoluteUrl } from '@/lib/site';
import { TRAIN_TYPE_PAGES } from '@/lib/train-types';
import { dhakaNow } from '@/lib/time';

export const dynamic = 'force-static';

/** Only real, indexable pages. Data pages carry the date the data last changed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const data = meta().lastUpdated;
  const today = dhakaNow().iso; // home & today pages change daily (nightly rebuild)
  const latest = (dates: string[]) => dates.sort().at(-1) ?? data;
  const u = (path: string, lastModified: string): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(path),
    lastModified,
  });
  return [
    u('/', today),
    u('/today/', today),
    u('/trains/', data),
    ...TRAIN_TYPE_PAGES.map((p) => u(`/trains/${p.slug}/`, data)),
    u('/routes/', data),
    u('/stations/', data),
    u('/notices/', latest(NOTICES.map((n) => n.date))),
    u('/guides/', latest(GUIDES.map((g) => g.updated))),
    ...publishedRoutes().map((r) => u(`/route/${routeSlug(r)}/`, data)),
    ...trainGroups().map((g) => u(`/train/${g.slug}/`, data)),
    ...stationPages().map((p) => u(`/station/${p.station.id}/`, data)),
    ...GUIDES.map((g) => u(`/guides/${g.slug}/`, g.updated)),
    ...['/about/', '/contact/', '/privacy-policy/', '/terms/', '/disclaimer/'].map((p) =>
      u(p, LEGAL_UPDATED),
    ),
  ];
}
