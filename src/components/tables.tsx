import Link from 'next/link';
import { toBnDigits } from '@/lib/bn';
import { stationPages, type Leg } from '@/lib/data';
import { DAY, stopOffsets, toMinutes } from '@/lib/time';
import type { Station, Train } from '@/lib/types';
import { Duration, OffDay, T, TodayOffBadge, TrainLabel, TypeBadge } from './ui';

const NextDay = () => <span className="ms-1 text-xs text-slate-500">(পরদিন)</span>;

export function LegTable({
  legs,
  fromName,
  toName,
}: {
  legs: Leg[];
  fromName: string;
  toName: string;
}) {
  return (
    <div className="tt-wrap">
      <table className="tt">
        <thead>
          <tr>
            <th scope="col">ট্রেন</th>
            <th scope="col">{fromName} ছাড়ে</th>
            <th scope="col">{toName} পৌঁছায়</th>
            <th scope="col">সময় লাগে</th>
            <th scope="col">সাপ্তাহিক বন্ধ</th>
          </tr>
        </thead>
        <tbody>
          {legs.map((l) => (
            <tr key={l.train.id} data-offday={l.offDay ?? undefined}>
              <td className="min-w-44">
                <TrainLabel train={l.train} />
                <span className="ms-1.5">
                  <TypeBadge type={l.train.type} />
                </span>
              </td>
              <td>
                <T t={l.dep} />
              </td>
              <td>
                <T t={l.arr} />
                {toMinutes(l.dep) + l.duration >= DAY && <NextDay />}
              </td>
              <td>
                <Duration minutes={l.duration} />
              </td>
              <td className="whitespace-nowrap">
                <OffDay day={l.offDay} />
                <TodayOffBadge />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StopTable({
  train,
  stationsById,
}: {
  train: Train;
  stationsById: Map<string, Station>;
}) {
  const timed = stopOffsets(train.stops);
  const dep0 = toMinutes(train.departure);
  const pageIds = new Set(stationPages().map((p) => p.station.id));
  const crosses = (o: number | null) => o !== null && dep0 + o >= DAY;
  return (
    <div className="tt-wrap">
      <table className="tt">
        <thead>
          <tr>
            <th scope="col" className="w-10">
              ক্রম
            </th>
            <th scope="col">স্টেশন</th>
            <th scope="col">পৌঁছায়</th>
            <th scope="col">ছাড়ে</th>
            <th scope="col">বিরতি</th>
          </tr>
        </thead>
        <tbody>
          {timed.map((s, i) => {
            const st = stationsById.get(s.station);
            const halt =
              s.arrOffset !== null && s.depOffset !== null ? s.depOffset - s.arrOffset : null;
            return (
              <tr key={`${s.station}-${i}`}>
                <td className="text-slate-500">{toBnDigits(i + 1)}</td>
                <td className="font-medium">
                  {st && pageIds.has(st.id) ? (
                    <Link href={`/station/${st.id}/`}>{st.bn}</Link>
                  ) : (
                    st?.bn
                  )}
                </td>
                <td>
                  {i === 0 ? (
                    <span className="text-sm text-slate-500">যাত্রা শুরু</span>
                  ) : (
                    <T t={s.arr} />
                  )}
                  {crosses(s.arrOffset) && <NextDay />}
                </td>
                <td>
                  {i === timed.length - 1 ? (
                    <span className="text-sm text-slate-500">যাত্রা শেষ</span>
                  ) : (
                    <T t={s.dep} />
                  )}
                  {crosses(s.depOffset) && <NextDay />}
                </td>
                <td className="text-slate-600">
                  {halt !== null ? `${toBnDigits(halt)} মিনিট` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
