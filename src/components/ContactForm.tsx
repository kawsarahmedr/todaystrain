'use client';

import Script from 'next/script';
import { useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: { reset: (widget?: string | HTMLElement) => void };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Status = { kind: 'idle' | 'sending' | 'ok' | 'error'; text?: string };

export function ContactForm({ supportEmail }: { supportEmail: string }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
      subject: String(fd.get('subject') ?? ''),
      message: String(fd.get('message') ?? ''),
      website: String(fd.get('website') ?? ''),
      turnstileToken: String(fd.get('cf-turnstile-response') ?? ''),
    };
    if (!payload.turnstileToken) {
      setStatus({
        kind: 'error',
        text: 'স্প্যাম-রোধী যাচাই শেষ হওয়া পর্যন্ত কয়েক সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন।',
      });
      return;
    }
    setStatus({ kind: 'sending' });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (res.ok && data.ok) {
        setStatus({ kind: 'ok', text: data.message });
        formRef.current?.reset();
      } else {
        setStatus({
          kind: 'error',
          text: data.error ?? 'দুঃখিত, বার্তা পাঠানো যায়নি। আবার চেষ্টা করুন।',
        });
      }
    } catch {
      setStatus({
        kind: 'error',
        text: 'ইন্টারনেট সংযোগে সমস্যা হয়েছে। সংযোগ দেখে আবার চেষ্টা করুন।',
      });
    }
    window.turnstile?.reset(); // tokens are single-use
  }

  const input =
    'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus:border-brand-500';
  const label = 'block text-sm font-medium text-slate-700';

  if (!SITE_KEY) {
    return (
      <p className="note">
        অনলাইন ফর্মটি এখনো চালু করা হয়নি। আপাতত সরাসরি{' '}
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a> ঠিকানায় ইমেইল করুন।
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="card relative space-y-4 p-5"
      noValidate={false}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          আপনার নাম
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            className={input}
          />
        </label>
        <label className={label}>
          ইমেইল
          <input
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            className={input}
          />
        </label>
      </div>
      <label className={label}>
        বিষয়
        <input name="subject" required minLength={3} maxLength={150} className={input} />
      </label>
      <label className={label}>
        বার্তা
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          className={input}
        />
      </label>
      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label>
          ওয়েবসাইট (খালি রাখুন)
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {/* Fixed height so the Turnstile widget cannot shift the layout when it loads. */}
      <div className="cf-turnstile h-[65px]" data-sitekey={SITE_KEY} data-theme="light" />
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={status.kind === 'sending'}
          className="btn btn-primary disabled:opacity-60"
        >
          {status.kind === 'sending' ? 'পাঠানো হচ্ছে…' : 'বার্তা পাঠান'}
        </button>
        <p
          role="status"
          aria-live="polite"
          className={`min-h-6 text-[0.95rem] ${status.kind === 'error' ? 'text-rose-700' : 'text-emerald-800'}`}
        >
          {status.text}
        </p>
      </div>
    </form>
  );
}
