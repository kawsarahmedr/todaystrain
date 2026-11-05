import Link from 'next/link';
import type { Block, Guide } from '@/content/guides/types';

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (!m) return p;
        const [, label, href] = m;
        return href!.startsWith('/') ? (
          <Link key={i} href={href!}>
            {label}
          </Link>
        ) : (
          <a key={i} href={href} rel="noopener" target="_blank">
            {label}
          </a>
        );
      })}
    </>
  );
}

function BlockView({ b }: { b: Block }) {
  if (typeof b === 'string') {
    return (
      <p>
        <Inline text={b} />
      </p>
    );
  }
  if ('ul' in b) {
    return (
      <ul>
        {b.ul.map((x, i) => (
          <li key={i}>
            <Inline text={x} />
          </li>
        ))}
      </ul>
    );
  }
  if ('ol' in b) {
    return (
      <ol>
        {b.ol.map((x, i) => (
          <li key={i}>
            <Inline text={x} />
          </li>
        ))}
      </ol>
    );
  }
  if ('table' in b) {
    return (
      <div className="tt-wrap">
        <table>
          <thead>
            <tr>
              {b.table.head.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.table.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>
                    <Inline text={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <p className="note">
      <Inline text={b.note} />
    </p>
  );
}

export function GuideBody({ guide }: { guide: Guide }) {
  return (
    <div className="prose-bn">
      {guide.sections.map((s) => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          {s.blocks.map((b, i) => (
            <BlockView key={i} b={b} />
          ))}
        </section>
      ))}
    </div>
  );
}

/** Rough word count of the visible guide text (used by tests to enforce 800+ words). */
export function guideWordCount(guide: Guide): number {
  const text = guide.sections
    .flatMap((s) => [
      s.h,
      ...s.blocks.flatMap((b) =>
        typeof b === 'string'
          ? [b]
          : 'ul' in b
            ? b.ul
            : 'ol' in b
              ? b.ol
              : 'table' in b
                ? [...b.table.head, ...b.table.rows.flat()]
                : [b.note],
      ),
    ])
    .join(' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  return text.split(/\s+/).filter(Boolean).length;
}
