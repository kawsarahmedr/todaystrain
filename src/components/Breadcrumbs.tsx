import Link from 'next/link';
import { breadcrumbSchema, type Crumb } from '@/lib/seo';
import { JsonLd } from './JsonLd';

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ name: 'হোম', path: '/' }, ...items];
  return (
    <>
      <nav aria-label="ব্রেডক্রাম্ব" className="mb-4 text-sm text-slate-600">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          {all.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">›</span>}
              {i === all.length - 1 ? (
                <span aria-current="page" className="text-slate-800">
                  {c.name}
                </span>
              ) : (
                <Link href={c.path}>{c.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbSchema(all)} />
    </>
  );
}
