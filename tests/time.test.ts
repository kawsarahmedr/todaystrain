import { describe, expect, it } from 'vitest';
import {
  dhakaNow,
  durationMinutes,
  liveState,
  serviceWeekdayFor,
  stopOffsets,
  upcomingDepartures,
} from '@/lib/time';

const NIGHT = {
  offDay: 5, // no departure from origin on Friday
  stops: [
    { station: 'a', arr: null, dep: '23:30' },
    { station: 'b', arr: '01:00', dep: '01:05' },
    { station: 'c', arr: '05:10', dep: null },
  ],
};
// Thursday 2026-11-05 is weekday 4 in Dhaka.
const at = (iso: string) => dhakaNow(new Date(iso));

describe('dhakaNow (Asia/Dhaka, never the visitor timezone)', () => {
  it('converts a UTC instant to the Dhaka calendar day and clock', () => {
    const n = dhakaNow(new Date('2026-11-05T18:30:00Z'));
    expect(n).toEqual({ iso: '2026-11-06', weekday: 5, minutes: 30 });
  });
  it('is unaffected by the process timezone', () => {
    const before = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';
    expect(dhakaNow(new Date('2026-11-05T05:59:00Z')).minutes).toBe(11 * 60 + 59);
    process.env.TZ = before;
  });
  it('handles Dhaka midnight exactly', () => {
    expect(dhakaNow(new Date('2026-11-05T18:00:00Z'))).toEqual({
      iso: '2026-11-06',
      weekday: 5,
      minutes: 0,
    });
  });
});

describe('midnight crossover', () => {
  it('computes durations across midnight', () => {
    expect(durationMinutes('23:30', '05:10')).toBe(340);
    expect(durationMinutes('10:15', '21:00')).toBe(645);
  });
  it('unwraps stop offsets past midnight', () => {
    const o = stopOffsets(NIGHT.stops);
    expect(o.map((s) => [s.arrOffset, s.depOffset])).toEqual([
      [null, 0],
      [90, 95],
      [340, null],
    ]);
  });
  it('maps after-midnight events to the previous service day', () => {
    // leaves origin 19:30, reaches a stop 275 min later (00:05 next day)
    expect(serviceWeekdayFor(19 * 60 + 30, 275, 1)).toBe(0);
    expect(serviceWeekdayFor(19 * 60 + 30, 200, 1)).toBe(1);
  });
});

describe('off-days and schedule-based position', () => {
  it("keeps Thursday's night service running on Friday morning even though Friday is the off-day", () => {
    const s = liveState(NIGHT, at('2026-11-05T20:00:00Z')); // Fri 02:00 Dhaka
    expect(s).toMatchObject({ kind: 'between', fromIndex: 1, toIndex: 2, fromYesterday: true });
  });
  it('reports off-today when the train does not leave its origin today', () => {
    expect(liveState(NIGHT, at('2026-11-06T17:40:00Z'))).toEqual({ kind: 'off-today' }); // Fri 23:40
  });
  it('reports minutes until departure before the train starts', () => {
    expect(liveState(NIGHT, at('2026-11-05T17:00:00Z'))).toEqual({
      kind: 'not-started',
      startsIn: 30,
    }); // Thu 23:00
  });
  it('detects a train waiting at a station', () => {
    const s = liveState(NIGHT, at('2026-11-05T19:02:00Z')); // Fri 01:02
    expect(s).toMatchObject({ kind: 'at-station', stopIndex: 1, leavesIn: 3 });
  });
  it('reports arrival after the journey ends', () => {
    const day = {
      offDay: null,
      stops: [NIGHT.stops[0]!, { station: 'x', arr: '23:50', dep: null }],
    };
    expect(liveState(day, at('2026-11-05T17:55:00Z'))).toEqual({ kind: 'arrived', minutesAgo: 5 }); // Thu 23:55
    // just after midnight the *next* service is reported, not yesterday's finished one
    expect(liveState(day, at('2026-11-05T18:00:00Z'))).toEqual({
      kind: 'not-started',
      startsIn: 1410,
    });
  });
});

describe('upcoming departures', () => {
  it('skips an after-midnight departure whose service day is the off-day', () => {
    const c = [{ key: 'chitra', offDay: 0, dep0: 19 * 60 + 30, offset: 275 }];
    // Monday 00:00 Dhaka: the 00:05 departure today belongs to Sunday's (cancelled) service
    const r = upcomingDepartures(c, at('2026-11-08T18:00:00Z'));
    expect(r).toEqual([{ key: 'chitra', minutesUntil: 1445, tomorrow: true }]);
  });
  it('sorts by time and honours the limit', () => {
    const c = [
      { key: 'late', offDay: null, dep0: 20 * 60, offset: 0 },
      { key: 'soon', offDay: null, dep0: 10 * 60, offset: 0 },
      { key: 'later', offDay: null, dep0: 22 * 60, offset: 0 },
    ];
    const r = upcomingDepartures(c, at('2026-11-05T03:00:00Z'), 2); // Thu 09:00
    expect(r.map((x) => x.key)).toEqual(['soon', 'late']);
  });
});
