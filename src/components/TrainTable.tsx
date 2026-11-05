import { OffDay, T, TodayOffBadge, TrainLabel } from '@/components/ui';
import { stationName } from '@/lib/data';
import type { Train } from '@/lib/types';

export function TrainTable({ trains }: { trains: Train[] }) {
  return (
    <div className="tt-wrap">
      <table className="tt">
        <thead>
          <tr>
            <th scope="col">ট্রেন</th>
            <th scope="col">রুট</th>
            <th scope="col">ছাড়ে</th>
            <th scope="col">পৌঁছায়</th>
            <th scope="col">সাপ্তাহিক বন্ধ</th>
          </tr>
        </thead>
        <tbody>
          {trains.map((t) => (
            <tr key={t.id} data-offday={t.offDay ?? undefined}>
              <td className="min-w-40">
                <TrainLabel train={t} />
              </td>
              <td className="min-w-40 text-[0.95rem]">
                {stationName(t.origin)} → {stationName(t.destination)}
              </td>
              <td>
                <T t={t.departure} />
              </td>
              <td>
                <T t={t.arrival} />
              </td>
              <td className="whitespace-nowrap">
                <OffDay day={t.offDay} />
                <TodayOffBadge />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
