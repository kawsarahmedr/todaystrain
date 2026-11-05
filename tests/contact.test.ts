import { describe, expect, it, vi } from 'vitest';
import { MAX_BODY_BYTES, MESSAGES, handleContact, type ContactEnv } from '@server/contact-handler';

const ENV: ContactEnv = {
  RESEND_API_KEY: 're_test_key',
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
  CONTACT_TO_EMAIL: 'owner@example.com',
};
const VALID = {
  name: 'রহিম উদ্দিন',
  email: 'rahim@example.com',
  subject: 'একটি সময় ভুল আছে',
  message: 'চিত্রা এক্সপ্রেসের ঈশ্বরদী স্টেশনের সময়টা মনে হয় বদলেছে।',
  website: '',
  turnstileToken: 'tok-123',
};

function req(
  body: unknown,
  init: { method?: string; origin?: string | null; type?: string; raw?: string } = {},
) {
  const headers = new Headers({
    'Content-Type': init.type ?? 'application/json',
    'CF-Connecting-IP': '203.0.113.7',
  });
  if (init.origin !== null) headers.set('Origin', init.origin ?? 'https://todaystrain.com');
  return new Request('https://todaystrain.com/api/contact', {
    method: init.method ?? 'POST',
    headers,
    body: (init.method ?? 'POST') === 'GET' ? undefined : (init.raw ?? JSON.stringify(body)),
  });
}

/** Mock fetch: Turnstile + Resend endpoints. */
function mockFetch({ human = true, resendStatus = 200 } = {}) {
  return vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    if (u.includes('turnstile')) return Response.json({ success: human });
    if (u.includes('api.resend.com'))
      return new Response(JSON.stringify({ id: 'email_1' }), { status: resendStatus });
    throw new Error(`unexpected fetch ${u}`);
  });
}

const read = async (r: Response) => ({
  status: r.status,
  body: (await r.json()) as Record<string, unknown>,
});

describe('contact handler', () => {
  it('sends the email through Resend with reply-to set to the visitor', async () => {
    const f = mockFetch();
    const { status, body } = await read(
      await handleContact(req(VALID), ENV, f as unknown as typeof fetch),
    );
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true, message: MESSAGES.ok });
    expect(f).toHaveBeenCalledTimes(2);

    const [turl, tinit] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(turl).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const form = tinit.body as URLSearchParams;
    expect(form.get('secret')).toBe('turnstile-secret');
    expect(form.get('response')).toBe('tok-123');
    expect(form.get('remoteip')).toBe('203.0.113.7');

    const [rurl, rinit] = f.mock.calls[1] as unknown as [string, RequestInit];
    expect(rurl).toBe('https://api.resend.com/emails');
    expect((rinit.headers as Record<string, string>).Authorization).toBe('Bearer re_test_key');
    const mail = JSON.parse(String(rinit.body));
    expect(mail).toMatchObject({
      from: 'TodaysTrain <noreply@todaystrain.com>',
      to: ['owner@example.com'],
      reply_to: 'rahim@example.com',
      subject: '[TodaysTrain যোগাযোগ] একটি সময় ভুল আছে',
    });
    expect(mail.text).toContain(VALID.message);
  });

  it('rejects non-POST methods with 405', async () => {
    const r = await handleContact(
      req(null, { method: 'GET' }),
      ENV,
      mockFetch() as unknown as typeof fetch,
    );
    expect(r.status).toBe(405);
    expect(r.headers.get('Allow')).toBe('POST');
  });

  it('rejects requests from other origins (or without an Origin header)', async () => {
    const f = mockFetch();
    expect(
      (
        await handleContact(
          req(VALID, { origin: 'https://evil.example' }),
          ENV,
          f as unknown as typeof fetch,
        )
      ).status,
    ).toBe(403);
    expect(
      (await handleContact(req(VALID, { origin: null }), ENV, f as unknown as typeof fetch)).status,
    ).toBe(403);
    expect(f).not.toHaveBeenCalled();
  });

  it('honours ALLOWED_ORIGINS for local testing', async () => {
    const env = { ...ENV, ALLOWED_ORIGINS: 'http://localhost:8788' };
    const r = await handleContact(
      req(VALID, { origin: 'http://localhost:8788' }),
      env,
      mockFetch() as unknown as typeof fetch,
    );
    expect(r.status).toBe(200);
  });

  it('validates fields and answers in Bangla', async () => {
    const f = mockFetch();
    const { status, body } = await read(
      await handleContact(
        req({ ...VALID, email: 'not-an-email', message: 'ছোট' }),
        ENV,
        f as unknown as typeof fetch,
      ),
    );
    expect(status).toBe(400);
    expect(body.error).toBe(MESSAGES.invalid);
    expect(body.fields).toEqual(expect.arrayContaining(['email', 'message']));
    expect(f).not.toHaveBeenCalled();
  });

  it('enforces length limits', async () => {
    const r = await handleContact(
      req({ ...VALID, subject: 'ক'.repeat(151) }),
      ENV,
      mockFetch() as unknown as typeof fetch,
    );
    expect(r.status).toBe(400);
  });

  it('rejects oversized bodies with 413', async () => {
    const big = JSON.stringify({ ...VALID, message: 'a'.repeat(MAX_BODY_BYTES) });
    const r = await handleContact(
      req(null, { raw: big }),
      ENV,
      mockFetch() as unknown as typeof fetch,
    );
    expect(r.status).toBe(413);
  });

  it('silently drops honeypot submissions without sending anything', async () => {
    const f = mockFetch();
    const { status, body } = await read(
      await handleContact(
        req({ ...VALID, website: 'http://spam.example' }),
        ENV,
        f as unknown as typeof fetch,
      ),
    );
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(f).not.toHaveBeenCalled();
  });

  it('refuses when Turnstile verification fails', async () => {
    const f = mockFetch({ human: false });
    const { status, body } = await read(
      await handleContact(req(VALID), ENV, f as unknown as typeof fetch),
    );
    expect(status).toBe(403);
    expect(body.error).toBe(MESSAGES.captcha);
    expect(f).toHaveBeenCalledTimes(1); // Resend never called
  });

  it('asks for the captcha when the token is missing', async () => {
    const { status, body } = await read(
      await handleContact(
        req({ ...VALID, turnstileToken: '' }),
        ENV,
        mockFetch() as unknown as typeof fetch,
      ),
    );
    expect(status).toBe(400);
    expect(body.error).toBe(MESSAGES.captcha);
  });

  it('returns 502 with a Bangla message when Resend fails', async () => {
    const { status, body } = await read(
      await handleContact(
        req(VALID),
        ENV,
        mockFetch({ resendStatus: 500 }) as unknown as typeof fetch,
      ),
    );
    expect(status).toBe(502);
    expect(body.error).toBe(MESSAGES.server);
  });

  it('returns 500 when secrets are not configured', async () => {
    const r = await handleContact(
      req(VALID),
      { ...ENV, RESEND_API_KEY: undefined },
      mockFetch() as unknown as typeof fetch,
    );
    expect(r.status).toBe(500);
  });

  it('strips line breaks from the subject (no header injection)', async () => {
    const f = mockFetch();
    await handleContact(
      req({ ...VALID, subject: 'হ্যালো\r\nBcc: victim@example.com' }),
      ENV,
      f as unknown as typeof fetch,
    );
    const mail = JSON.parse(String((f.mock.calls[1] as unknown as [string, RequestInit])[1].body));
    expect(mail.subject).toBe('[TodaysTrain যোগাযোগ] হ্যালো Bcc: victim@example.com');
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });

  it('accepts a classic form-urlencoded post (no JavaScript)', async () => {
    const raw = new URLSearchParams({
      ...VALID,
      turnstileToken: '',
      'cf-turnstile-response': 'tok-9',
    }).toString();
    const r = await handleContact(
      req(null, { raw, type: 'application/x-www-form-urlencoded' }),
      ENV,
      mockFetch() as unknown as typeof fetch,
    );
    expect(r.status).toBe(200);
  });
});
