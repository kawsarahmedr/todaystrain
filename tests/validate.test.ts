import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateData } from '@/lib/validate';

const stations = ['a', 'b', 'c'].map((id) => ({ id, bn: id, en: id }));
const base = {
  id: '1',
  number: '1',
  name: 'ট্রেন',
  nameEn: 'Train',
  type: 'intercity',
  zone: 'west',
  offDay: null,
  origin: 'a',
  destination: 'c',
  departure: '23:00',
  arrival: '02:00',
  stops: [
    { station: 'a', arr: null, dep: '23:00' },
    { station: 'b', arr: '00:30', dep: '00:35' },
    { station: 'c', arr: '02:00', dep: null },
  ],
  stopsSource: 'timetable',
  status: 'active',
  verified: true,
};
const errors = (trains: unknown[]) =>
  validateData({ trains, stations })
    .filter((i) => i.level === 'error')
    .map((i) => i.code);

describe('validateData', () => {
  it('accepts a train that crosses midnight', () => {
    expect(errors([base])).toEqual([]);
  });
  it('flags duplicate trains', () => {
    expect(errors([base, base])).toContain('duplicate-train');
  });
  it('flags out-of-order stops', () => {
    const bad = {
      ...base,
      stops: [base.stops[0], { station: 'b', arr: '22:00', dep: '22:05' }, base.stops[2]],
    };
    expect(errors([bad])).toContain('out-of-order');
  });
  it('flags unknown stations', () => {
    expect(errors([{ ...base, destination: 'zz' }])).toContain('unknown-station');
  });
  it('flags missing times', () => {
    expect(errors([{ ...base, arrival: null }])).toContain('missing-time');
  });
  it('rejects malformed times', () => {
    expect(errors([{ ...base, departure: '25:00' }])).toContain('schema');
  });
  it('passes parser errors through as build-breaking errors', () => {
    const issues = validateData({
      trains: [],
      stations,
      parserIssues: [{ level: 'error', code: 'unknown-glyph', message: 'x' }],
    });
    expect(issues[0]).toMatchObject({ level: 'error', code: 'parser:unknown-glyph' });
  });
  it('reports unverified (hand-transcribed) rows as a warning only', () => {
    const issues = validateData({ trains: [{ ...base, verified: false }], stations });
    expect(issues).toEqual([expect.objectContaining({ level: 'warning', code: 'unverified' })]);
  });
  it('the committed generated data has no critical errors', () => {
    const gen = path.join(process.cwd(), 'data', 'generated');
    const read = (f: string) => JSON.parse(fs.readFileSync(path.join(gen, f), 'utf8'));
    const issues = validateData({
      trains: read('trains.json').trains,
      stations: read('stations.json').stations,
      parserIssues: read('report.json').issues,
    });
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
  });
});
