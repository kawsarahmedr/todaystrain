export type Stop = { station: string; arr: string | null; dep: string | null };

export type TrainType = 'intercity' | 'mail' | 'commuter' | 'local' | 'shuttle' | 'international';

export type Train = {
  id: string;
  number: string | null;
  name: string;
  nameEn: string | null;
  type: TrainType;
  zone: 'west' | 'east';
  /** Weekly off-day as JS weekday (0 = Sunday … 6 = Saturday); null = runs every day. */
  offDay: number | null;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  stops: Stop[];
  /** 'timetable' = full stop list from the source; 'endpoints' = origin/destination only. */
  stopsSource: 'timetable' | 'station-tables' | 'endpoints' | 'override';
  status: 'active' | 'planned' | 'hidden' | 'suspended';
  /** false = transcribed by hand from a scanned PDF and not yet double-checked. */
  verified: boolean;
  note?: string | null;
  demu?: boolean;
  overrides?: string[];
  source?: { id: string; page: number; row: number };
};

export type Station = { id: string; bn: string; en: string; aliases?: string[]; note?: string };

export type SourceMeta = {
  id: string;
  title: string;
  zone: string;
  kind: 'text' | 'scan';
  file: string;
  sha256: string;
  documentDate?: string;
};

export type Meta = {
  lastUpdated: string;
  contentHash: string;
  sources: SourceMeta[];
  counts: { trains: number; stations: number; errors: number; warnings: number };
};
