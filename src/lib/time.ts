/**
 * Schedule & clock logic. Everything is computed in Asia/Dhaka (UTC+6, no DST),
 * never in the visitor's own timezone. Pure functions: safe on server and client.
 */
import type { Stop } from './types';

export const DHAKA_TZ = 'Asia/Dhaka';
export const DAY = 1440;

export type DhakaNow = {
  /** Calendar date in Dhaka, YYYY-MM-DD */
  iso: string;
  /** 0 = Sunday … 6 = Saturday, in Dhaka */
  weekday: number;
  /** Minutes since Dhaka midnight (0–1439) */
  minutes: number;
};

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: DHAKA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hourCycle: 'h23',
});
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function dhakaNow(date: Date = new Date()): DhakaNow {
  const p: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) p[part.type] = part.value;
  const hour = Number(p.hour) % 24; // some engines print "24" at midnight
  return {
    iso: `${p.year}-${p.month}-${p.day}`,
    weekday: WEEKDAY_INDEX[p.weekday ?? ''] ?? 0,
    minutes: hour * 60 + Number(p.minute),
  };
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function fromMinutes(total: number): string {
  const m = ((total % DAY) + DAY) % DAY;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Travel time between two clock times, assuming < 24 h (handles crossing midnight). */
export function durationMinutes(dep: string, arr: string): number {
  return (toMinutes(arr) - toMinutes(dep) + DAY) % DAY;
}

export const prevWeekday = (weekday: number, days = 1) => (((weekday - days) % 7) + 7) % 7;

export function runsOn(offDay: number | null, weekday: number): boolean {
  return offDay === null || offDay !== weekday;
}

export type TimedStop = Stop & { arrOffset: number | null; depOffset: number | null };

/** Minutes after the origin departure for every stop time, unwrapping midnight. */
export function stopOffsets(stops: Stop[]): TimedStop[] {
  let base: number | null = null;
  let prev = 0;
  let dayAdd = 0;
  const conv = (t: string | null): number | null => {
    if (t === null) return null;
    let abs = toMinutes(t) + dayAdd;
    if (base === null) {
      base = abs;
      prev = abs;
      return 0;
    }
    while (abs < prev) {
      abs += DAY;
      dayAdd += DAY;
    }
    prev = abs;
    return abs - base;
  };
  return stops.map((s) => {
    const arrOffset = conv(s.arr);
    const depOffset = conv(s.dep);
    return { ...s, arrOffset, depOffset };
  });
}

/**
 * Off-days refer to the day a train leaves its ORIGIN. An event (arrival/departure at
 * some stop) that happens `offset` minutes after an origin departure at `dep0`
 * minutes-of-day belongs to the service that started `floor((dep0+offset)/1440)` days
 * before the event's calendar day.
 */
export function serviceWeekdayFor(dep0: number, offset: number, eventWeekday: number): number {
  return prevWeekday(eventWeekday, Math.floor((dep0 + offset) / DAY));
}

export type LiveState =
  | { kind: 'off-today' }
  | { kind: 'not-started'; startsIn: number }
  | { kind: 'at-station'; stopIndex: number; leavesIn: number; fromYesterday: boolean }
  | {
      kind: 'between';
      fromIndex: number;
      toIndex: number;
      progress: number;
      arrivesIn: number;
      fromYesterday: boolean;
    }
  | { kind: 'arrived'; minutesAgo: number };

type Schedulable = { offDay: number | null; stops: Stop[] };

/** Schedule-based (NOT real-time) position of a train at `now`. */
export function liveState(train: Schedulable, now: DhakaNow): LiveState {
  const timed = stopOffsets(train.stops);
  const first = train.stops[0];
  const last = timed[timed.length - 1];
  if (!first?.dep || !last) return { kind: 'off-today' };
  const dep0 = toMinutes(first.dep);
  const total = last.arrOffset ?? last.depOffset ?? 0;

  // A service that left yesterday may still be running after midnight.
  for (const fromYesterday of [true, false]) {
    const serviceWeekday = fromYesterday ? prevWeekday(now.weekday) : now.weekday;
    if (!runsOn(train.offDay, serviceWeekday)) continue;
    const elapsed = now.minutes + (fromYesterday ? DAY : 0) - dep0;
    if (elapsed < 0 || elapsed > total) continue;
    for (let i = 0; i < timed.length; i++) {
      const s = timed[i]!;
      const a = s.arrOffset ?? s.depOffset ?? 0;
      const d = s.depOffset ?? s.arrOffset ?? 0;
      if (elapsed >= a && elapsed <= d) {
        return { kind: 'at-station', stopIndex: i, leavesIn: d - elapsed, fromYesterday };
      }
      const next = timed[i + 1];
      if (next) {
        const na = next.arrOffset ?? next.depOffset ?? 0;
        if (elapsed > d && elapsed < na) {
          return {
            kind: 'between',
            fromIndex: i,
            toIndex: i + 1,
            progress: (elapsed - d) / (na - d),
            arrivesIn: na - elapsed,
            fromYesterday,
          };
        }
      }
    }
  }
  if (!runsOn(train.offDay, now.weekday)) return { kind: 'off-today' };
  const elapsedToday = now.minutes - dep0;
  if (elapsedToday < 0) return { kind: 'not-started', startsIn: -elapsedToday };
  return { kind: 'arrived', minutesAgo: elapsedToday - total };
}

export type DepartureCandidate = {
  key: string;
  offDay: number | null;
  /** origin departure, minutes-of-day */
  dep0: number;
  /** minutes after the origin departure at which the train leaves this station */
  offset: number;
};

export type UpcomingDeparture = { key: string; minutesUntil: number; tomorrow: boolean };

/** Next departures from one station, honouring off-days and midnight crossover. */
export function upcomingDepartures(
  candidates: DepartureCandidate[],
  now: DhakaNow,
  limit = 3,
): UpcomingDeparture[] {
  const out: UpcomingDeparture[] = [];
  for (const c of candidates) {
    const clock = (c.dep0 + c.offset) % DAY;
    for (const tomorrow of [false, true]) {
      const eventWeekday = tomorrow ? (now.weekday + 1) % 7 : now.weekday;
      if (!runsOn(c.offDay, serviceWeekdayFor(c.dep0, c.offset, eventWeekday))) continue;
      const until = clock + (tomorrow ? DAY : 0) - now.minutes;
      if (until >= 0) {
        out.push({ key: c.key, minutesUntil: until, tomorrow });
        break;
      }
    }
  }
  return out.sort((a, b) => a.minutesUntil - b.minutesUntil).slice(0, limit);
}
