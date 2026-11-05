'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const KEY = 'tt-consent-v1';

/** Fixed-position notice (overlays content, so it causes no layout shift). */
export function ConsentNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser-only storage after mount
      if (!window.localStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  if (!show) return null;
  const accept = () => {
    try {
      window.localStorage.setItem(KEY, new Date().toISOString());
    } catch {
      /* storage unavailable: just hide for this visit */
    }
    setShow(false);
  };

  return (
    <div
      role="region"
      aria-label="কুকি নোটিশ"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur"
    >
      <div className="container-page flex flex-col gap-3 text-[0.95rem] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-slate-700">
          সাইটটি ঠিকমতো চালাতে আমরা ব্রাউজারে ছোট কিছু তথ্য (কুকি/লোকাল স্টোরেজ) রাখি। ভবিষ্যতে
          বিজ্ঞাপন চালু হলে Google-সহ বিজ্ঞাপন অংশীদাররাও কুকি ব্যবহার করতে পারে। বিস্তারিত:{' '}
          <Link href="/privacy-policy/">গোপনীয়তা নীতি</Link>।
        </p>
        <button type="button" onClick={accept} className="btn btn-primary shrink-0">
          ঠিক আছে
        </button>
      </div>
    </div>
  );
}
