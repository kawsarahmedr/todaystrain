import { FOREIGN_STATIONS, activeTrains, allStations } from './data';

/** Stations offered in the from/to selects: those served by at least 3 active trains. */
export function searchStations(): { id: string; bn: string }[] {
  const counts = new Map<string, number>();
  for (const t of activeTrains())
    for (const s of new Set(t.stops.map((x) => x.station))) counts.set(s, (counts.get(s) ?? 0) + 1);
  return allStations()
    .filter((s) => !FOREIGN_STATIONS.has(s.id) && (counts.get(s.id) ?? 0) >= 3)
    .map((s) => ({ id: s.id, bn: s.bn }))
    .sort((a, b) => a.bn.localeCompare(b.bn, 'bn'));
}
