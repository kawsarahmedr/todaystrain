import Link from 'next/link';

export const CONSENT_KEY = 'tt-consent-v1';

/** Runs in <head> before first paint: returning visitors never see the banner flash. */
export const consentHeadScript = `try{if(localStorage.getItem('${CONSENT_KEY}'))document.documentElement.classList.add('consent-ok')}catch(e){}`;

const acceptScript = `(function(){var b=document.getElementById('consent-accept');if(!b)return;b.addEventListener('click',function(){try{localStorage.setItem('${CONSENT_KEY}',new Date().toISOString())}catch(e){}document.documentElement.classList.add('consent-ok')})})()`;

/**
 * Server-rendered, fixed-position notice (overlays content: no layout shift, painted with
 * the first frame instead of after hydration). Dismissal works without React.
 */
export function ConsentNotice() {
  return (
    <div
      id="consent"
      role="region"
      aria-label="কুকি নোটিশ"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-3 text-sm leading-6 text-slate-700">
        <p className="flex-1">
          এই সাইট লোকাল স্টোরেজ ব্যবহার করে; বিজ্ঞাপন চালু হলে Google-সহ অংশীদাররা কুকি ব্যবহার করতে
          পারে। <Link href="/privacy-policy/">বিস্তারিত</Link>
        </p>
        <button
          id="consent-accept"
          type="button"
          className="btn btn-primary h-9 shrink-0 px-4 text-sm"
        >
          ঠিক আছে
        </button>
      </div>
      <script dangerouslySetInnerHTML={{ __html: acceptScript }} />
    </div>
  );
}
