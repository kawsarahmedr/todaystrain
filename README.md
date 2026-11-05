# TodaysTrain.com

A fast, fully static, Bangla (`lang="bn"`) website for Bangladesh train information: schedules,
weekly off-days, route, train and station pages, ticket guides, and a client-side "today" layer
computed in **Asia/Dhaka** time. The site is independent and is **not** affiliated with
Bangladesh Railway.

- **Stack:** Next.js 16 (App Router, `output: 'export'`), React 19, TypeScript (strict), Tailwind CSS 4.
- **Hosting:** Cloudflare Pages (free plan) via GitHub Actions Direct Upload.
- **Server code:** only one Cloudflare Pages Function, the contact form (`functions/api/contact.ts`).
- **Data:** parsed from Bangladesh Railway timetable PDFs in `data/pdfs/`. Nothing is invented.

| What | Count (current data) |
|---|---|
| Active trains | 227 (120 intercity, 18 mail, 52 commuter/shuttle, 37 local) |
| Train pages (full stop lists) | 31 (62 West-zone intercity trains, both directions per page) |
| Route pages | 15 (both directions per page) |
| Station pages | 42 (stations served by 12+ trains) |
| Guides | 7 (800+ words each, enforced by a test) |
| Exported HTML pages | ~114 |

---

## 1. Local setup

Requirements: **Node 22** (see `.nvmrc`). Python 3.12 with `pdfplumber` is needed only to
regenerate data from the PDFs.

```bash
npm ci
```

```bash
npm run dev
```

```bash
npm run build
```

`npm run build` runs, in order:
1. `data:validate`: fails on any critical data error.
2. The search-index builder: writes `public/data/search-index.json`.
3. `next build`: static export to `out/`.
4. `scripts/check-export.ts`: every page has `lang="bn"`, a title, a canonical URL and real Bangla
   text; no broken internal links; the sitemap lists only real, indexable pages.

Preview the export together with the contact Function (Cloudflare's local runtime):

```bash
npx wrangler pages dev out
```

Other scripts: `npm test` (Vitest), `npm run lint`, `npm run typecheck` (site and Function),
`npm run format`.

Public build-time variables go in `.env.local` (see `.env.example`):
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: the Turnstile site key (public).
- `NEXT_PUBLIC_ADS_ENABLED`: keep `false` until AdSense is approved.

## 2. Project layout

```
data/
  pdfs/                     source PDFs (originals, never edited)
  sources.json              registry of source documents
  dictionaries/             glyph map, stations (+ every spelling seen), English train names
  transcriptions/           hand transcription of the scanned East-zone PDF (+ off-day summary)
  overrides.json            manual corrections / extra (e.g. Eid special) trains
  generated/                parser output: trains, stations, routes, meta, report (committed)
scripts/
  parse_pdfs.py             PDF → JSON (Python, pdfplumber)
  pdftext.py, extract_tables.py
  validate-data.ts          build-breaking data validation
  build-search-index.ts, check-export.ts
src/app/                    pages (App Router), sitemap.ts, robots.ts
src/content/                routes (intros/tips/FAQs), guides, notices
src/lib/                    data access, Asia/Dhaka time engine, validation, SEO helpers
src/components/             UI; live/ = small client islands
server/contact-handler.ts   contact form logic (pure, unit-tested)
functions/api/contact.ts    Cloudflare Pages Function wrapper
docs/competitor-notes.md    structure/feature notes (no copied content)
```

## 3. Data pipeline: adding PDFs and regenerating data

```bash
pip install -r scripts/requirements.txt
```

```bash
npm run data:parse
```

```bash
npm run data:validate
```

**How parsing works.** The West-zone PDF has a text layer, but its Bangla conjuncts have no Unicode
mapping. pdfplumber reports those glyphs as `(cid:N)`. `data/dictionaries/glyphmap-west-zone.json`
maps all 66 of them. `scripts/pdftext.py` then restores the logical character order (reph and
pre-base vowel signs). Tables are read cell by cell from the PDF's grid. Station names resolve
through `data/dictionaries/stations.json`, and unknown names or glyphs are **errors**, never
guesses. The facing-page "সংক্ষিপ্ত সময়সূচী" tables provide full stop lists. The parser
cross-checks four sources against each other: train lists, abbreviated timetables, station tables
and the weekly off-day summary. Inconsistencies go to `data/generated/report.json`.

**Scanned PDFs** cannot be parsed. Pages 1–2 of the East-zone PDF are transcribed in
`data/transcriptions/east-zone-intercity.csv`, and every row has `verified=0`. The site marks
these trains with ✱. After you check a row against the scan, set `verified` to `1` and re-run
`npm run data:parse`. Pages 3–8 (commuter/mail lists and the abbreviated timetables with
intermediate stations) are **not transcribed yet**. That is why East-zone trains have
origin/destination only and no train pages.

**Adding a new PDF**
1. Copy it to `data/pdfs/` and add an entry to `data/sources.json` (`kind: "text"` or `"scan"`).
2. For a text PDF in a new font, run the parser. Unknown `(cid:N)` glyphs are reported, so add them
   to a glyph map.
3. Run `python3 scripts/parse_pdfs.py --dump-names`, then add any new station spellings to
   `stations.json` (as `aliases`) and English names for new trains to `trains.json` (needed for
   URLs).
4. Re-run `npm run data:parse`. The parser updates `meta.lastUpdated` only when the data actually
   changes; that date is what pages show as "সর্বশেষ আপডেট".

**Overrides** (`data/overrides.json`, applied after parsing; every entry needs a `reason`):
- `patch`: set fields on a train, e.g. `{"id": "3107", "set": {"status": "active"}, "reason": "…"}`.
- `stopPatch`: fix one stop, e.g. `{"id": "784", "station": "khatra", "set": {"arr": null}}`.
  Prefer `null` over a guessed value.
- `remove`: drop a train.
- `add`: add a complete train object, for example an Eid special train with
  `id`, `number`, `name`, `nameEn`, `type`, `zone`, `offDay`, `origin`, `destination`,
  `departure`, `arrival`, `stops`, `stopsSource`, `status` and `verified`, copied from the official
  announcement.

CI re-runs the parser with `--check` and fails if the committed `data/generated/` is stale.

**Validation** (`scripts/validate-data.ts`, run before every build) fails on: parser errors
(unknown glyph, station or weekday; bad time), duplicate trains, missing times, unknown stations,
out-of-order stops (midnight-aware), journeys of 24 hours or more, and intercity trains without an
English slug. Warnings such as source inconsistencies or unverified rows are printed but don't
break the build.

## 4. Content

- **Routes**: `src/content/routes.ts`. Adding a route needs only a new entry (`from`, `to`,
  original intro, tips, optional FAQs). Times, quick facts and data-driven FAQs are computed. A
  route with fewer than 2 direct trains is skipped automatically.
- **Guides**: `src/content/guides/*.ts`. Uncertain statements carry `// TODO-VERIFY:` comments.
- **Notices**: `src/content/notices.ts`, which includes a public corrections log.
- **Station pages** appear automatically for every station served by 12+ active trains.
- **Train pages** appear automatically for every active train with a full stop list.

## 5. "Today" layer (client-side only)

Everything is pre-rendered. Small client islands then add the live parts after mount:
- the Bangladesh clock;
- "next train in X minutes";
- "আজ বন্ধ" badges and today's off-day list;
- the **schedule-based** position, labelled "সময়সূচী অনুযায়ী আনুমানিক অবস্থান" and never
  presented as real-time.

All time logic is in `src/lib/time.ts` and uses `Intl.DateTimeFormat` with `Asia/Dhaka`, never the
visitor's timezone. Off-days mean the day a train does **not leave its origin**. Services that run
past midnight keep running, and off-days shift at later stations. These rules are unit-tested.

Server HTML stays neutral. Live boxes have fixed heights, badges are reserved in the HTML (and
only revealed), and the clock uses `useSyncExternalStore`. Measured CLS is 0.000.

## 6. Deployment (Cloudflare Pages via GitHub Actions)

The workflows are in `.github/workflows/`:
- `ci.yml` (pull requests and branches): lint, typecheck, test, build, parser `--check`.
- `deploy.yml`: test, build, `wrangler pages deploy out --project-name=todaystrain`. Triggers:
  push to `main`, daily at **00:30 Asia/Dhaka** (`30 18 * * *` UTC), and manual dispatch. Direct
  Upload does not use Cloudflare's Git build quota.

**One-time setup**
1. **Create the Pages project** (Direct Upload): Cloudflare dashboard → *Workers & Pages* →
   *Create* → *Pages* → *Upload assets*, name it `todaystrain` with production branch `main`. Or
   use the CLI:
   ```bash
   npx wrangler pages project create todaystrain --production-branch=main
   ```
2. **GitHub repository secrets** (*Settings → Secrets and variables → Actions*):
   - `CLOUDFLARE_API_TOKEN`: an API token with **Account → Cloudflare Pages → Edit**.
   - `CLOUDFLARE_ACCOUNT_ID`: shown on the dashboard sidebar.
3. **GitHub repository variables** (public values): `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, and
   `NEXT_PUBLIC_ADS_ENABLED` = `false`.
4. **Cloudflare Pages environment variables** (*Pages project → Settings → Variables and
   Secrets*, Production, type **Secret**): `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`,
   `CONTACT_TO_EMAIL`. These exist **only** in Cloudflare and are never committed.
5. **Custom domain**: *Pages project → Custom domains → Set up a domain* → `todaystrain.com`
   (Cloudflare creates the DNS record if the zone is on Cloudflare). Optionally add
   `www.todaystrain.com` and redirect it to the apex with a Redirect Rule.

## 7. Contact form: Resend, Turnstile and manual testing

**Resend domain verification**
1. In the Resend dashboard → *Domains* → add `todaystrain.com`.
2. Add the DNS records Resend shows (DKIM `resend._domainkey` TXT, plus the SPF/MX records for its
   sending subdomain) in Cloudflare DNS, then click *Verify*.
3. Create an API key with *Sending access* and store it as the `RESEND_API_KEY` Pages secret. Mail
   is sent from `noreply@todaystrain.com` to `CONTACT_TO_EMAIL`, with `reply_to` set to the visitor.

**Turnstile**
1. In the Cloudflare dashboard → *Turnstile* → *Add widget*, use hostname `todaystrain.com` and
   Managed mode.
2. Use the **site key** for the `NEXT_PUBLIC_TURNSTILE_SITE_KEY` GitHub variable (it is baked in at
   build time).
3. Store the **secret key** as the `TURNSTILE_SECRET_KEY` Pages secret.
4. For local testing, use Cloudflare's test keys. In `.env.example` and `.dev.vars.example`, site
   `1x00000000000000000000AA` and secret `1x0000000000000000000000000000000AA` always pass.

**What the handler does** (`server/contact-handler.ts`): it accepts POST only; checks the Origin
against an allow-list; caps the body at 16 KB; validates fields with Zod and length limits; drops
honeypot submissions silently; strips control characters (no header injection); verifies Turnstile
server-side (and fails closed); sends through the Resend REST API; and replies with JSON in Bangla.
It is covered by unit tests with mocked `fetch` (`tests/contact.test.ts`).

**Manual test steps**
1. Copy `.dev.vars.example` to `.dev.vars` with a real `RESEND_API_KEY`, the Turnstile test
   secret, your inbox as `CONTACT_TO_EMAIL`, and `ALLOWED_ORIGINS=http://localhost:8788`.
2. Build with the test site key, then serve locally:
   ```bash
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run build
   ```
   ```bash
   npx wrangler pages dev out
   ```
3. Open `http://localhost:8788/contact/` and submit. Expect the Bangla success message and an email
   whose Reply-To is the address you entered.
4. Negative checks:
   - `curl -i http://localhost:8788/api/contact` → 405.
   - POST with `Origin: https://evil.example` → 403.
   - An invalid email → 400 with a Bangla error.
   - Filling the hidden `website` field → 200, but no email is sent.
5. After deploying, repeat step 3 on `https://todaystrain.com/contact/` with the real Turnstile
   keys, and confirm the email arrives.

## 8. Pre-AdSense checklist

- [ ] Review every `TODO-VERIFY` (41 markers, mostly guide rules; list them with
      `grep -rn "TODO-VERIFY" src data`).
- [ ] Verify the 58 transcribed East-zone rows against the scan and set `verified=1`.
- [ ] Confirm the timetable's effective date (the PDFs don't print one) and update
      `data/sources.json`.
- [ ] Decide on the hidden international trains (`data/overrides.json`).
- [ ] Set the real support address in `src/lib/site.ts` and make sure the mailbox works.
- [ ] Deploy to `todaystrain.com` with HTTPS and test the contact form in production.
- [ ] Verify the domain in Google Search Console and submit `https://todaystrain.com/sitemap.xml`.
- [ ] Run PageSpeed Insights on the home, route and train pages (lab measurements here: LCP 0.7–1.4 s
      and CLS 0.000 on a throttled mobile profile).
- [ ] Apply for AdSense. After approval:
  - add the AdSense script;
  - set `NEXT_PUBLIC_ADS_ENABLED=true` (`<AdSlot>` reserves fixed-height space and is never placed
    next to navigation or buttons);
  - replace `public/ads.txt` with your publisher line;
  - add a Google-certified consent platform for EEA/UK visitors;
  - update the Privacy Policy date.

## 9. Known limitations

- There are no fares, because the source PDFs contain none. Pages say so and link to the official
  e-ticket site.
- East-zone trains have origin and destination times only, until pages 5–8 of the scanned PDF are
  transcribed.
- Four West-zone station-table times disagree with the same PDF's train timetables
  (`report.json`); the train timetable is shown. Two PDF typos are blanked (see the corrections log
  on `/notices/`).
