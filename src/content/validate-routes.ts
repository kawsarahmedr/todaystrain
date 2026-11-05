import { allStations, legsBetween } from '../lib/data';
import type { Issue } from '../lib/validate';
import { ROUTES } from './routes';

/** A route page is generated only if the data has at least this many direct trains (both directions). */
export const MIN_ROUTE_TRAINS = 2;

export function routeSlug(r: { from: string; to: string }): string {
  return `${r.from}-${r.to}`;
}

export function publishedRoutes() {
  return ROUTES.filter(
    (r) => legsBetween(r.from, r.to).length + legsBetween(r.to, r.from).length >= MIN_ROUTE_TRAINS,
  );
}

export function validateRoutes(): Issue[] {
  const issues: Issue[] = [];
  const ids = new Set(allStations().map((s) => s.id));
  const slugs = new Set<string>();
  for (const r of ROUTES) {
    const slug = routeSlug(r);
    if (slugs.has(slug))
      issues.push({ level: 'error', code: 'route-duplicate', message: `রুট ${slug} দুবার আছে` });
    slugs.add(slug);
    for (const s of [r.from, r.to]) {
      if (!ids.has(s))
        issues.push({
          level: 'error',
          code: 'route-station',
          message: `রুট ${slug}: অজানা স্টেশন ${s}`,
        });
    }
    if (!ids.has(r.from) || !ids.has(r.to)) continue;
    const n = legsBetween(r.from, r.to).length + legsBetween(r.to, r.from).length;
    if (n < MIN_ROUTE_TRAINS) {
      issues.push({
        level: 'warning',
        code: 'route-thin',
        message: `রুট ${slug}: মাত্র ${n}টি ট্রেন — পেজ তৈরি হবে না`,
      });
    }
    if (r.intro.join('').length < 400) {
      issues.push({
        level: 'warning',
        code: 'route-intro',
        message: `রুট ${slug}: ভূমিকা খুব ছোট`,
      });
    }
  }
  return issues;
}
