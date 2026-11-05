/** Fails the build (exit 1) on critical data errors. Run: npm run data:validate */
import fs from 'node:fs';
import path from 'node:path';
import { validateData } from '../src/lib/validate';
import { validateRoutes } from '../src/content/validate-routes';

const GEN = path.join(process.cwd(), 'data', 'generated');
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(GEN, f), 'utf8'));

const issues = [
  ...validateData({
    trains: read('trains.json').trains,
    stations: read('stations.json').stations,
    parserIssues: read('report.json').issues,
  }),
  ...validateRoutes(),
];
const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');
for (const w of warnings) console.warn(`  warn  ${w.code}: ${w.message}`);
for (const e of errors) console.error(`  ERROR ${e.code}: ${e.message}`);
console.log(`data validation: ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length > 0 ? 1 : 0);
