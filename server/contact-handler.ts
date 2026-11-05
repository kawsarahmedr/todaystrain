/**
 * Contact form handler (runs as a Cloudflare Pages Function; see functions/api/contact.ts).
 * Pure function of (request, env, fetch) so it can be unit-tested with a mocked fetch.
 *
 * Secrets live ONLY in Cloudflare Pages environment variables:
 *   RESEND_API_KEY, TURNSTILE_SECRET_KEY, CONTACT_TO_EMAIL
 */
import { z } from 'zod';

export type ContactEnv = {
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  CONTACT_TO_EMAIL?: string;
  /** optional override, default "TodaysTrain <noreply@todaystrain.com>" */
  CONTACT_FROM_EMAIL?: string;
  /** optional comma-separated list, default production origins */
  ALLOWED_ORIGINS?: string;
};

export const MAX_BODY_BYTES = 16_000;
const DEFAULT_ORIGINS = 'https://todaystrain.com,https://www.todaystrain.com';
const DEFAULT_FROM = 'TodaysTrain <noreply@todaystrain.com>';

export const MESSAGES = {
  ok: 'ধন্যবাদ! আপনার বার্তা পাঠানো হয়েছে। সাধারণত কয়েক কার্যদিবসের মধ্যে উত্তর দেওয়া হয়।',
  invalid:
    'ফর্মের কিছু তথ্য ঠিক নেই। আপনার নাম, সঠিক ইমেইল, বিষয় এবং অন্তত ১০ অক্ষরের বার্তা লিখুন।',
  captcha: 'স্প্যাম-রোধী যাচাই সম্পন্ন হয়নি। পাতাটি নতুন করে লোড করে আবার চেষ্টা করুন।',
  origin: 'অনুমোদিত ঠিকানা থেকে অনুরোধ আসেনি।',
  method: 'এই ঠিকানায় কেবল POST অনুরোধ গ্রহণ করা হয়।',
  tooLarge: 'বার্তাটি অনেক বড়। অনুগ্রহ করে সংক্ষেপে লিখুন।',
  server:
    'দুঃখিত, এই মুহূর্তে বার্তা পাঠানো যাচ্ছে না। কিছুক্ষণ পরে আবার চেষ্টা করুন অথবা সরাসরি ইমেইল করুন।',
} as const;

/** Collapse whitespace and strip control characters (prevents header injection in the subject). */
const singleLine = (s: string) =>
  s
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const ContactSchema = z.object({
  name: z.string().transform(singleLine).pipe(z.string().min(2).max(100)),
  email: z.string().trim().pipe(z.email().max(200)),
  subject: z.string().transform(singleLine).pipe(z.string().min(3).max(150)),
  message: z
    .string()
    .transform((s) => s.replace(/\r\n?/g, '\n').trim())
    .pipe(z.string().min(10).max(5000)),
  turnstileToken: z.string().min(1).max(4096),
});

export type ContactInput = z.infer<typeof ContactSchema>;

function json(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

export async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string | null,
  fetchImpl: typeof fetch,
): Promise<boolean> {
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set('remoteip', ip);
  try {
    const res = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export async function handleContact(
  request: Request,
  env: ContactEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== 'POST')
    return json(405, { ok: false, error: MESSAGES.method }, { Allow: 'POST' });

  const allowed = (env.ALLOWED_ORIGINS ?? DEFAULT_ORIGINS)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = request.headers.get('Origin');
  if (!origin || !allowed.includes(origin)) return json(403, { ok: false, error: MESSAGES.origin });

  if (!env.RESEND_API_KEY || !env.TURNSTILE_SECRET_KEY || !env.CONTACT_TO_EMAIL) {
    console.error('contact: missing RESEND_API_KEY, TURNSTILE_SECRET_KEY or CONTACT_TO_EMAIL');
    return json(500, { ok: false, error: MESSAGES.server });
  }

  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BODY_BYTES) {
    return json(413, { ok: false, error: MESSAGES.tooLarge });
  }
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json(400, { ok: false, error: MESSAGES.invalid });
  }
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return json(413, { ok: false, error: MESSAGES.tooLarge });
  }

  let body: Record<string, unknown>;
  try {
    const type = request.headers.get('Content-Type') ?? '';
    body = type.includes('application/json')
      ? (JSON.parse(raw) as Record<string, unknown>)
      : Object.fromEntries(new URLSearchParams(raw));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('not an object');
  } catch {
    return json(400, { ok: false, error: MESSAGES.invalid });
  }

  // Honeypot: real visitors never fill the hidden "website" field. Pretend success, send nothing.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json(200, { ok: true, message: MESSAGES.ok });
  }

  const token = body.turnstileToken || body['cf-turnstile-response'];
  const parsed = ContactSchema.safeParse({ ...body, turnstileToken: token });
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
    if (fields.length === 1 && fields[0] === 'turnstileToken') {
      return json(400, { ok: false, error: MESSAGES.captcha });
    }
    return json(400, { ok: false, error: MESSAGES.invalid, fields });
  }
  const input = parsed.data;

  const human = await verifyTurnstile(
    input.turnstileToken,
    env.TURNSTILE_SECRET_KEY,
    request.headers.get('CF-Connecting-IP'),
    fetchImpl,
  );
  if (!human) return json(403, { ok: false, error: MESSAGES.captcha });

  const text = [
    `নাম: ${input.name}`,
    `ইমেইল: ${input.email}`,
    `বিষয়: ${input.subject}`,
    '',
    input.message,
    '',
    '—',
    'todaystrain.com যোগাযোগ ফর্ম থেকে পাঠানো',
  ].join('\n');

  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM_EMAIL ?? DEFAULT_FROM,
        to: [env.CONTACT_TO_EMAIL],
        reply_to: input.email,
        subject: `[TodaysTrain যোগাযোগ] ${input.subject}`,
        text,
      }),
    });
    if (!res.ok) {
      console.error('contact: Resend responded', res.status, await res.text().catch(() => ''));
      return json(502, { ok: false, error: MESSAGES.server });
    }
  } catch (e) {
    console.error('contact: Resend request failed', e);
    return json(502, { ok: false, error: MESSAGES.server });
  }
  return json(200, { ok: true, message: MESSAGES.ok });
}
