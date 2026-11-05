/** Build-time data access (server only: reads data/generated/*.json from disk). */
import fs from 'node:fs';
import path from 'node:path';
import { DAY, stopOffsets, toMinutes, type TimedStop } from './time';
import type { Meta, Station, Train, TrainType } from './types';

const GEN = path.join(process.cwd(), 'data', 'generated');
const read = <T>(file: string): T => JSON.parse(fs.readFileSync(path.join(GEN, file), 'utf8')) as T;

type DB = {
  all: Train[];
  active: Train[];
  stations: Station[];
  byId: Map<string, Station>;
  meta: Meta;
};
let db: DB | null = null;

function load(): DB {
  if (db) return db;
  const all = read<{ trains: Train[] }>('trains.json').trains;
  const stations = read<{ stations: Station[] }>('stations.json').stations;
  db = {
    all,
    active: all.filter((t) => t.status === 'active'),
    stations,
    byId: new Map(stations.map((s) => [s.id, s])),
    meta: read<Meta>('meta.json'),
  };
  return db;
}

export const allTrains = (): Train[] => load().all;
export const activeTrains = (): Train[] => load().active;
export const allStations = (): Station[] => load().stations;
export const meta = (): Meta => load().meta;

export function station(id: string): Station {
  const s = load().byId.get(id);
  if (!s) throw new Error(`Unknown station: ${id}`);
  return s;
}
export const stationName = (id: string): string => station(id).bn;

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const TYPE_LABEL: Record<TrainType, string> = {
  intercity: 'আন্তঃনগর',
  mail: 'মেইল',
  commuter: 'কমিউটার',
  local: 'লোকাল',
  shuttle: 'শাটল',
  international: 'আন্তর্দেশীয়',
};

export const FOREIGN_STATIONS = new Set(['kolkata', 'new-jalpaiguri']);

/** Off-day as it applies at a given stop: services past midnight shift the weekday. */
export function offDayAt(train: Train, stop: TimedStop): number | null {
  if (train.offDay === null) return null;
  const offset = stop.depOffset ?? stop.arrOffset ?? 0;
  const days = Math.floor((toMinutes(train.departure) + offset) / DAY);
  return (train.offDay + days) % 7;
}

// ---------------------------------------------------------------- train pages
/** One page per train name that has a full stop list; both directions on one page. */
export type TrainGroup = {
  slug: string;
  name: string;
  nameEn: string;
  zone: string;
  trains: Train[];
};

export function hasTrainPage(t: Train): boolean {
  return t.status === 'active' && t.stopsSource === 'timetable' && !!t.slug && !!t.nameEn;
}

export function trainPath(t: Train): string | null {
  return hasTrainPage(t) ? `/train/${t.slug}/` : null;
}

let groupsCache: TrainGroup[] | null = null;
export function trainGroups(): TrainGroup[] {
  if (groupsCache) return groupsCache;
  const map = new Map<string, TrainGroup>();
  for (const t of activeTrains()) {
    if (!hasTrainPage(t)) continue;
    const slug = t.slug!;
    const g = map.get(slug) ?? { slug, name: t.name, nameEn: t.nameEn!, zone: t.zone, trains: [] };
    g.trains.push(t);
    map.set(slug, g);
  }
  const num = (t: Train) => Number((t.number ?? '0').split('/')[0]);
  for (const g of map.values()) g.trains.sort((a, b) => num(a) - num(b));
  groupsCache = [...map.values()].sort((a, b) => num(a.trains[0]!) - num(b.trains[0]!));
  return groupsCache;
}

export function trainGroup(slug: string): TrainGroup | undefined {
  return trainGroups().find((g) => g.slug === slug);
}

// ------------------------------------------------------------- station pages
export type Service = {
  train: Train;
  index: number;
  stop: TimedStop;
  offDay: number | null;
  role: 'origin' | 'destination' | 'stop';
};

export function servicesAt(stationId: string): Service[] {
  const out: Service[] = [];
  for (const t of activeTrains()) {
    const i = t.stops.findIndex((s) => s.station === stationId);
    if (i < 0) continue;
    const stop = stopOffsets(t.stops)[i]!;
    out.push({
      train: t,
      index: i,
      stop,
      offDay: offDayAt(t, stop),
      role: i === 0 ? 'origin' : i === t.stops.length - 1 ? 'destination' : 'stop',
    });
  }
  const key = (s: Service) => toMinutes((s.stop.dep ?? s.stop.arr)!);
  return out.sort((a, b) => key(a) - key(b));
}

/** Stations with enough trains (from the data) to deserve their own page. */
export const MIN_STATION_TRAINS = 12;
export function stationPages(): { station: Station; count: number }[] {
  const counts = new Map<string, number>();
  for (const t of activeTrains()) {
    for (const s of new Set(t.stops.map((x) => x.station))) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return allStations()
    .filter((s) => !FOREIGN_STATIONS.has(s.id) && (counts.get(s.id) ?? 0) >= MIN_STATION_TRAINS)
    .map((s) => ({ station: s, count: counts.get(s.id)! }))
    .sort((a, b) => b.count - a.count);
}

// --------------------------------------------------------------------- routes
export type Leg = {
  train: Train;
  from: TimedStop;
  to: TimedStop;
  dep: string;
  arr: string;
  duration: number;
  /** off-day as it applies to the departure from `from` */
  offDay: number | null;
};

export function legsBetween(fromId: string, toId: string): Leg[] {
  const out: Leg[] = [];
  for (const t of activeTrains()) {
    const i = t.stops.findIndex((s) => s.station === fromId);
    const j = t.stops.findIndex((s) => s.station === toId);
    if (i < 0 || j <= i) continue;
    const timed = stopOffsets(t.stops);
    const from = timed[i]!;
    const to = timed[j]!;
    const dep = from.dep;
    const arr = to.arr ?? to.dep;
    if (!dep || !arr || from.depOffset === null) continue;
    out.push({
      train: t,
      from,
      to,
      dep,
      arr,
      duration: (to.arrOffset ?? to.depOffset ?? 0) - from.depOffset,
      offDay: offDayAt(t, from),
    });
  }
  return out.sort((a, b) => toMinutes(a.dep) - toMinutes(b.dep));
}
