/** Data validation shared by scripts/validate-data.ts (CLI, runs before every build) and tests. */
import { z } from 'zod';
import { DAY, stopOffsets } from './time';
import type { Station, Train } from './types';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const time = z.string().regex(TIME);

const StopSchema = z.object({ station: z.string(), arr: time.nullable(), dep: time.nullable() });
export const TrainSchema = z.object({
  id: z.string().min(1),
  number: z.string().nullable(),
  name: z.string().min(1),
  nameEn: z.string().nullable(),
  type: z.enum(['intercity', 'mail', 'commuter', 'local', 'shuttle', 'international']),
  zone: z.enum(['west', 'east']),
  offDay: z.number().int().min(0).max(6).nullable(),
  origin: z.string(),
  destination: z.string(),
  departure: time.nullable(),
  arrival: time.nullable(),
  stops: z.array(StopSchema),
  stopsSource: z.enum(['timetable', 'station-tables', 'endpoints', 'override']),
  status: z.enum(['active', 'planned', 'hidden', 'suspended']),
  verified: z.boolean(),
});

export type Issue = { level: 'error' | 'warning'; code: string; message: string };

export function validateData(input: {
  trains: unknown[];
  stations: Station[];
  parserIssues?: { level: string; code: string; message: string }[];
}): Issue[] {
  const issues: Issue[] = [];
  const err = (code: string, message: string) => issues.push({ level: 'error', code, message });
  const warn = (code: string, message: string) => issues.push({ level: 'warning', code, message });

  for (const p of input.parserIssues ?? []) {
    (p.level === 'error' ? err : warn)(`parser:${p.code}`, p.message);
  }

  const stationIds = new Set(input.stations.map((s) => s.id));
  const ids = new Set<string>();
  const numbers = new Set<string>();
  let unverified = 0;

  for (const raw of input.trains) {
    const parsed = TrainSchema.safeParse(raw);
    if (!parsed.success) {
      err('schema', `ট্রেন ${(raw as Train)?.id ?? '?'}: ${parsed.error.issues[0]?.message}`);
      continue;
    }
    const t = parsed.data as Train;
    if (ids.has(t.id)) err('duplicate-train', `ট্রেন আইডি ${t.id} একাধিকবার আছে`);
    ids.add(t.id);
    if (t.status !== 'active') continue;
    if (t.number) {
      if (numbers.has(t.number)) err('duplicate-number', `ট্রেন নম্বর ${t.number} একাধিকবার আছে`);
      numbers.add(t.number);
    }
    if (!t.departure || !t.arrival) err('missing-time', `ট্রেন ${t.id}: ছাড়া/পৌঁছার সময় নেই`);
    if (t.stops.length < 2) err('stops', `ট্রেন ${t.id}: কমপক্ষে দুটি স্টপ দরকার`);
    for (const s of t.stops) {
      if (!stationIds.has(s.station))
        err('unknown-station', `ট্রেন ${t.id}: অজানা স্টেশন ${s.station}`);
    }
    for (const sid of [t.origin, t.destination]) {
      if (!stationIds.has(sid)) err('unknown-station', `ট্রেন ${t.id}: অজানা স্টেশন ${sid}`);
    }
    const first = t.stops[0];
    const last = t.stops[t.stops.length - 1];
    if (first && (first.station !== t.origin || !first.dep)) {
      err('origin', `ট্রেন ${t.id}: প্রথম স্টপ উৎস স্টেশনের সঙ্গে মেলে না বা ছাড়ার সময় নেই`);
    }
    if (last && (last.station !== t.destination || !last.arr)) {
      err('destination', `ট্রেন ${t.id}: শেষ স্টপ গন্তব্যের সঙ্গে মেলে না বা পৌঁছার সময় নেই`);
    }
    if (first?.dep && t.departure && first.dep !== t.departure) {
      warn('departure-mismatch', `ট্রেন ${t.id}: তালিকা ${t.departure}, সময়সূচী ${first.dep}`);
    }
    if (last?.arr && t.arrival && last.arr !== t.arrival) {
      warn('arrival-mismatch', `ট্রেন ${t.id}: তালিকা ${t.arrival}, সময়সূচী ${last.arr}`);
    }
    // monotonic stop times, journey shorter than a day
    const timed = stopOffsets(t.stops);
    let prev = -1;
    for (const s of timed) {
      for (const o of [s.arrOffset, s.depOffset]) {
        if (o === null) continue;
        if (o < prev) err('out-of-order', `ট্রেন ${t.id}: ${s.station} এর সময় আগের স্টপের আগে`);
        prev = o;
      }
    }
    if (prev >= DAY) err('too-long', `ট্রেন ${t.id}: যাত্রাকাল ২৪ ঘণ্টার বেশি`);
    for (let i = 1; i < timed.length; i++) {
      const a = timed[i - 1]!;
      const b = timed[i]!;
      const gap = (b.arrOffset ?? b.depOffset ?? 0) - (a.depOffset ?? a.arrOffset ?? 0);
      if (t.stops.length > 2 && gap > 12 * 60) {
        err(
          'out-of-order',
          `ট্রেন ${t.id}: ${a.station} → ${b.station} এর মধ্যে ১২ ঘণ্টার বেশি ব্যবধান`,
        );
      }
    }
    if (t.type === 'intercity' && !t.nameEn)
      err('english-name', `ট্রেন ${t.id}: ইংরেজি নাম নেই (URL)`);
    if (!t.verified) unverified++;
  }
  if (unverified > 0) {
    warn('unverified', `${unverified}টি ট্রেনের তথ্য স্ক্যান থেকে হাতে তোলা, এখনো যাচাই হয়নি`);
  }
  return issues;
}
