const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

export function toBnDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

/** Index = JS Date#getDay() (0 = Sunday). */
export const WEEKDAYS_BN = [
  'রবিবার',
  'সোমবার',
  'মঙ্গলবার',
  'বুধবার',
  'বৃহস্পতিবার',
  'শুক্রবার',
  'শনিবার',
] as const;

export const MONTHS_BN = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
] as const;

/** "2026-11-05" -> "৫ নভেম্বর ২০২৬" */
export function formatDateBn(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${toBnDigits(d)} ${MONTHS_BN[m - 1]} ${toBnDigits(y)}`;
}

function periodBn(h: number): string {
  if (h >= 4 && h < 6) return 'ভোর';
  if (h >= 6 && h < 12) return 'সকাল';
  if (h >= 12 && h < 15) return 'দুপুর';
  if (h >= 15 && h < 18) return 'বিকাল';
  if (h >= 18 && h < 20) return 'সন্ধ্যা';
  return 'রাত';
}

/** "21:45" -> "রাত ৯:৪৫" (12-hour clock with a Bangla time-of-day word). */
export function formatTimeBn(hhmm: string): string {
  const [hs, ms] = hhmm.split(':');
  const h = Number(hs);
  const m = Number(ms);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${periodBn(h)} ${toBnDigits(h12)}:${toBnDigits(String(m).padStart(2, '0'))}`;
}

/** For sentences: "06:00" -> "সকাল ৬টায়", "22:45" -> "রাত ১০টা ৪৫ মিনিটে". */
export function atTimeBn(hhmm: string): string {
  const [hs, ms] = hhmm.split(':');
  const h = Number(hs);
  const m = Number(ms);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0
    ? `${periodBn(h)} ${toBnDigits(h12)}টায়`
    : `${periodBn(h)} ${toBnDigits(h12)}টা ${toBnDigits(m)} মিনিটে`;
}

/** "21:45" -> "২১:৪৫" (24-hour, as printed in railway timetables). */
export function formatTime24Bn(hhmm: string): string {
  return toBnDigits(hhmm);
}

/** 295 -> "৪ ঘণ্টা ৫৫ মিনিট" */
export function formatDurationBn(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${toBnDigits(m)} মিনিট`;
  if (m === 0) return `${toBnDigits(h)} ঘণ্টা`;
  return `${toBnDigits(h)} ঘণ্টা ${toBnDigits(m)} মিনিট`;
}
