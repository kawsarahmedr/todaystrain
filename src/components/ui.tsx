import Link from 'next/link';
import { WEEKDAYS_BN, formatDateBn, formatDurationBn, formatTimeBn, toBnDigits } from '@/lib/bn';
import { TYPE_LABEL, meta, trainPath } from '@/lib/data';
import type { Train, TrainType } from '@/lib/types';

/** A clock time as printed in the timetable, shown 12-hour with a Bangla period word. */
export function T({ t }: { t: string | null | undefined }) {
  if (!t) return <span className="text-slate-400">—</span>;
  return (
    <time dateTime={t} title={`২৪ ঘণ্টার হিসাবে ${toBnDigits(t)}`} className="whitespace-nowrap">
      {formatTimeBn(t)}
    </time>
  );
}

export function Duration({ minutes }: { minutes: number }) {
  return <span className="whitespace-nowrap">{formatDurationBn(minutes)}</span>;
}

export function OffDay({ day }: { day: number | null }) {
  return day === null ? (
    <span className="text-slate-600">নেই</span>
  ) : (
    <span>{WEEKDAYS_BN[day]}</span>
  );
}

/** Reserved in the HTML (invisible); the client "today" script reveals it. */
export function TodayOffBadge() {
  return (
    <span data-today-badge="off" className="badge ms-1.5 bg-rose-100 text-rose-800">
      আজ বন্ধ
    </span>
  );
}

const TYPE_STYLE: Record<TrainType, string> = {
  intercity: 'bg-brand-100 text-brand-800',
  mail: 'bg-amber-100 text-amber-900',
  commuter: 'bg-emerald-100 text-emerald-900',
  local: 'bg-slate-200 text-slate-800',
  shuttle: 'bg-violet-100 text-violet-900',
  international: 'bg-sky-100 text-sky-900',
};

export function TypeBadge({ type }: { type: TrainType }) {
  return <span className={`badge ${TYPE_STYLE[type]}`}>{TYPE_LABEL[type]}</span>;
}

export function UnverifiedMark() {
  return (
    <span
      title="স্ক্যান করা নথি থেকে হাতে তোলা; পুনরায় যাচাইয়ের অপেক্ষায়"
      aria-label="যাচাই চলছে"
      className="ms-1 text-amber-700"
    >
      ✱
    </span>
  );
}

export function TrainLabel({ train, link = true }: { train: Train; link?: boolean }) {
  const href = link ? trainPath(train) : null;
  const label = (
    <>
      {train.name}
      {train.number && (
        <span className="font-normal text-slate-500"> ({toBnDigits(train.number)})</span>
      )}
    </>
  );
  return (
    <>
      {href ? (
        <Link href={href} className="font-medium">
          {label}
        </Link>
      ) : (
        <span className="font-medium">{label}</span>
      )}
      {!train.verified && <UnverifiedMark />}
    </>
  );
}

export function DataNotice({ unverified = false }: { unverified?: boolean }) {
  const m = meta();
  return (
    <aside className="mt-12 rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
      <p className="font-semibold text-slate-800">সর্বশেষ আপডেট: {formatDateBn(m.lastUpdated)}</p>
      <p className="mt-1">
        এই পাতার সময়সূচী বাংলাদেশ রেলওয়ের প্রকাশিত সময়সূচী (PDF) থেকে সাজানো। রেলওয়ে যেকোনো সময়
        সময়সূচী বদলাতে পারে এবং ট্রেন দেরিতেও চলতে পারে, তাই যাত্রার আগে অফিসিয়াল সূত্রে মিলিয়ে
        নিন। TodaysTrain বাংলাদেশ রেলওয়ের অফিসিয়াল সাইট নয়।
      </p>
      {unverified && (
        <p className="mt-1">
          <span className="text-amber-700">✱</span> চিহ্নিত ট্রেনের তথ্য স্ক্যান করা নথি থেকে হাতে
          তোলা, তাই সেগুলো পুনরায় যাচাইয়ের অপেক্ষায় আছে।
        </p>
      )}
      <p className="mt-1">
        <Link href="/about/#data">তথ্য কীভাবে সংগ্রহ ও যাচাই করা হয়</Link> ·{' '}
        <Link href="/contact/">ভুল চোখে পড়লে জানান</Link>
      </p>
    </aside>
  );
}

export function PageHeader({ title, lead }: { title: string; lead?: React.ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl leading-snug font-bold sm:text-3xl">{title}</h1>
      {lead && <p className="mt-3 text-lg text-slate-700">{lead}</p>}
    </header>
  );
}
