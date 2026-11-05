import { describe, expect, it } from 'vitest';
import { guideWordCount } from '@/components/GuideBody';
import { GUIDES } from '@/content/guides';
import { ROUTES } from '@/content/routes';

describe('editorial content', () => {
  it.each(GUIDES.map((g) => [g.slug, g] as const))('guide %s has at least 800 words', (_, g) => {
    expect(guideWordCount(g)).toBeGreaterThanOrEqual(800);
  });
  it('guide slugs are unique and English', () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });
  it('every route has a multi-paragraph intro and tips', () => {
    for (const r of ROUTES) {
      expect(r.intro.length).toBeGreaterThanOrEqual(2);
      expect(r.tips.length).toBeGreaterThanOrEqual(3);
    }
  });
  it('route intros are not near-duplicates of each other', () => {
    const shingles = (s: string) => {
      const w = s.split(/\s+/);
      return new Set(w.slice(0, -2).map((_, i) => w.slice(i, i + 3).join(' ')));
    };
    const sets = ROUTES.map((r) => shingles(r.intro.join(' ')));
    for (let i = 0; i < sets.length; i++) {
      for (let j = i + 1; j < sets.length; j++) {
        const a = sets[i]!;
        const b = sets[j]!;
        const inter = [...a].filter((x) => b.has(x)).length;
        expect(inter / Math.min(a.size, b.size)).toBeLessThan(0.2);
      }
    }
  });
});
