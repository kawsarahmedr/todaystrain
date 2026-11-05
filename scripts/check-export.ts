/**
 * Post-build checks on the static export (out/):
 *  - every HTML page is lang="bn", has a title, a canonical URL and real Bangla text
 *  - every internal link points to an exported file
 *  - sitemap.xml lists only existing, indexable pages (and every indexable page)
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'out');
const SITE = 'https://todaystrain.com';
const problems: string[] = [];
const warnings: string[] = [];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const files = walk(OUT);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const toUrlPath = (file: string) => {
  const rel = '/' + path.relative(OUT, file).split(path.sep).join('/');
  return rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
};
const exists = (urlPath: string) => {
  const clean = decodeURI(urlPath.split(/[?#]/)[0] ?? '/');
  const p = path.join(OUT, clean);
  return (fs.existsSync(p) && fs.statSync(p).isFile()) || fs.existsSync(path.join(p, 'index.html'));
};

const indexable = new Set<string>();
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const url = toUrlPath(file);
  if (url.startsWith('/_next/') || ['/_not-found/', '/404/', '/404.html'].includes(url)) continue;
  if (!/<html[^>]*lang="bn"/.test(html)) problems.push(`${url}: missing lang="bn"`);
  if (!/<title>[^<]+<\/title>/.test(html)) problems.push(`${url}: missing <title>`);
  const main = html.match(/<main[\s\S]*<\/main>/)?.[0] ?? '';
  const bangla = (main.replace(/<[^>]+>/g, ' ').match(/[ঀ-৿]/g) ?? []).length;
  if (bangla < 200) problems.push(`${url}: too little Bangla text in <main> (${bangla} chars)`);
  const noindex = /<meta name="robots" content="noindex/.test(html);
  if (!noindex) {
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (!canonical) problems.push(`${url}: missing canonical`);
    else if (canonical !== SITE + url)
      problems.push(`${url}: canonical ${canonical} does not match`);
    indexable.add(url);
  }
  for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
    const href = m[1]!;
    if (href.startsWith('//')) continue;
    if (!exists(href)) problems.push(`${url}: broken internal link ${href}`);
  }
}

const sitemapPath = path.join(OUT, 'sitemap.xml');
if (!fs.existsSync(sitemapPath)) problems.push('sitemap.xml missing');
else {
  const locs = [...fs.readFileSync(sitemapPath, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => m[1]!,
  );
  const inMap = new Set<string>();
  for (const loc of locs) {
    if (!loc.startsWith(SITE + '/')) problems.push(`sitemap: foreign URL ${loc}`);
    const p = loc.slice(SITE.length);
    inMap.add(p);
    if (!exists(p)) problems.push(`sitemap: ${loc} does not exist`);
    else if (!indexable.has(p)) problems.push(`sitemap: ${loc} is not an indexable page`);
  }
  for (const p of indexable) if (!inMap.has(p)) warnings.push(`not in sitemap: ${p}`);
}
for (const f of ['robots.txt', 'ads.txt'])
  if (!fs.existsSync(path.join(OUT, f))) problems.push(`${f} missing`);

for (const w of warnings) console.warn('  warn ', w);
for (const p of problems) console.error('  ERROR', p);
console.log(
  `export check: ${htmlFiles.length} HTML files, ${indexable.size} indexable, ${problems.length} problem(s)`,
);
process.exit(problems.length ? 1 : 0);
