import { Breadcrumbs } from './Breadcrumbs';
import { formatDateBn } from '@/lib/bn';

export const LEGAL_UPDATED = '2026-11-05';

export function LegalPage({
  title,
  path,
  children,
}: {
  title: string;
  path: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ name: title, path }]} />
      <article className="mx-auto max-w-3xl">
        <h1 className="text-2xl leading-snug font-bold sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          সর্বশেষ হালনাগাদ: <time dateTime={LEGAL_UPDATED}>{formatDateBn(LEGAL_UPDATED)}</time>
        </p>
        <div className="prose-bn mt-6">{children}</div>
      </article>
    </div>
  );
}
