/** Writes public/data/search-index.json: compact data for the client-side from/to search. */
import fs from 'node:fs';
import path from 'node:path';
import { FOREIGN_STATIONS, activeTrains, allStations, meta, trainPath } from '../src/lib/data';

const index = {
  v: 1,
  updated: meta().lastUpdated,
  stations: allStations()
    .filter((s) => !FOREIGN_STATIONS.has(s.id))
    .map((s) => [s.id, s.bn, s.en]),
  trains: activeTrains().map((t) => ({
    id: t.id,
    n: t.number,
    name: t.name,
    type: t.type,
    off: t.offDay,
    p: trainPath(t),
    v: t.verified,
    s: t.stops.map((s) => [s.station, s.arr, s.dep]),
  })),
};
const dir = path.join(process.cwd(), 'public', 'data');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'search-index.json'), JSON.stringify(index));
console.log(`search index: ${index.trains.length} trains, ${index.stations.length} stations`);
