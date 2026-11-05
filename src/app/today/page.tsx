import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LiveClock } from '@/components/live/LiveClock';
import { NextDepartures, type DepartureItem } from '@/components/live/NextDepartures';
import { TodayEnhancer } from '@/components/live/TodayEnhancer';
import { TodayOffList } from '@/components/TodayOffList';
import { DataNotice, PageHeader, TrainLabel } from '@/components/ui';
import { WEEKDAYS_BN, toBnDigits } from '@/lib/bn';
import { activeTrains, servicesAt, stationName } from '@/lib/data';
import { pageMetadata } from '@/lib/seo';
import { toMinutes } from '@/lib/time';

export const metadata = pageMetadata({
  title: 'আজকের ট্রেন: আজ কোন ট্রেন বন্ধ ও পরবর্তী ট্রেন কখন',
  description:
    'বাংলাদেশ সময় অনুযায়ী আজ কোন আন্তঃনগর ট্রেনের সাপ্তাহিক বন্ধ, প্রধান স্টেশন থেকে পরবর্তী ট্রেন কখন ছাড়বে এবং সপ্তাহের প্রতিটি দিনের বন্ধের তালিকা।',
  path: '/today/',
});

const HUBS = ['dhaka', 'chattogram', 'rajshahi', 'khulna', 'sylhet', 'ishwardi'];

function hubItems(id: string): DepartureItem[] {
  return servicesAt(id)
    .filter((s) => s.stop.dep && s.train.type === 'intercity')
    .map((s) => ({
      key: s.train.id,
      label: `${s.train.name} → ${stationName(s.train.destination)}`,
      time: s.stop.dep!,
      offDay: s.train.offDay,
      dep0: toMinutes(s.train.departure),
      offset: s.stop.depOffset ?? 0,
    }));
}

export default function TodayPage() {
  const intercity = activeTrains().filter((t) => t.type === 'intercity');
  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ name: 'আজকের ট্রেন', path: '/today/' }]} />
      <PageHeader
        title="আজকের ট্রেন"
        lead="আজ কোন ট্রেনের সাপ্তাহিক বন্ধ আর প্রধান স্টেশনগুলো থেকে পরবর্তী আন্তঃনগর ট্রেন কখন ছাড়বে — সব হিসাব বাংলাদেশ সময় (Asia/Dhaka) অনুযায়ী, আপনি যে দেশেই থাকুন।"
      />
      <LiveClock className="mb-6 text-slate-700" />

      <TodayOffList trains={intercity} />

      <section className="mt-10">
        <h2 className="text-xl font-bold">প্রধান স্টেশন থেকে পরবর্তী আন্তঃনগর ট্রেন</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {HUBS.map((id) => (
            <NextDepartures
              key={id}
              title={`${stationName(id)} থেকে`}
              items={hubItems(id)}
              limit={3}
            />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">সপ্তাহের কোন দিন কোন আন্তঃনগর ট্রেন বন্ধ</h2>
        <div className="tt-wrap mt-3">
          <table className="tt">
            <thead>
              <tr>
                <th scope="col">বার</th>
                <th scope="col">বন্ধ থাকে (যাত্রা শুরুর স্টেশন থেকে ছাড়ে না)</th>
              </tr>
            </thead>
            <tbody>
              {WEEKDAYS_BN.map((day, d) => {
                const list = intercity.filter((t) => t.offDay === d);
                return (
                  <tr key={day} data-offday={d}>
                    <th scope="row" className="align-top whitespace-nowrap">
                      {day}{' '}
                      <span className="text-sm font-normal text-slate-500">
                        ({toBnDigits(list.length)}টি)
                      </span>
                    </th>
                    <td>
                      <ul className="flex flex-wrap gap-x-4 gap-y-1">
                        {list.map((t) => (
                          <li key={t.id}>
                            <TrainLabel train={t} />
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="prose-bn mt-10">
        <h2>“আজ” ও সাপ্তাহিক বন্ধ কীভাবে হিসাব করা হয়</h2>
        <p>
          রেলওয়ের সময়সূচীতে একটি ট্রেনের সাপ্তাহিক বন্ধ বলতে বোঝানো হয়, সেদিন ট্রেনটি তার যাত্রা
          শুরুর স্টেশন থেকে ছাড়ে না। তাই কোনো ট্রেন বৃহস্পতিবার রাতে ছেড়ে শুক্রবার ভোরে গন্তব্যে
          পৌঁছালে, শুক্রবার তার বন্ধের দিন হলেও বৃহস্পতিবারের যাত্রাটি শুক্রবার ভোর পর্যন্ত চলতে
          থাকে। আমাদের হিসাবেও ঠিক এই নিয়ম মানা হয়েছে।
        </p>
        <p>
          পাতার “আজ” সবসময় বাংলাদেশ সময় অনুযায়ী ঠিক হয়, ব্রাউজারের নিজস্ব সময় অঞ্চল অনুযায়ী
          নয়। ফলে প্রবাস থেকে দেখলেও আপনি বাংলাদেশের তারিখ ও সময় অনুযায়ী তথ্য পাবেন। পরবর্তী
          ট্রেনের হিসাব কেবল প্রকাশিত সময়সূচীর ওপর নির্ভর করে; ট্রেন দেরিতে চললে বাস্তবের সঙ্গে
          মিলবে না। সময়সূচী পড়ার বিস্তারিত নিয়ম জানতে দেখুন{' '}
          <Link href="/guides/read-timetable/">সময়সূচী পড়ার গাইড</Link>।
        </p>
      </section>

      <DataNotice unverified={intercity.some((t) => !t.verified)} />
      <TodayEnhancer />
    </div>
  );
}
