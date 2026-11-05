# Competitor notes: ajkertrain.com (structure and features only)

Studied on 2026-11-05 for information architecture and features only. No text, headings,
FAQs, images, layout code or branding were copied, and none should be. All TodaysTrain copy
is written originally.

## What the site is
- WordPress site (LiteSpeed cache, an SEO plugin emitting Organization/WebSite/WebPage JSON-LD).
- AdSense and Google Tag Manager are loaded on every page (auto ads; no fixed slots seen),
  plus a third-party script domain. Social share links (Facebook, X, WhatsApp, Telegram).

## Page types (from its sitemap: ~344 posts, 8 pages, 5 categories)
| Type | Count | URL pattern | Notes |
|---|---|---|---|
| Train, one per number **per direction** | ~155 | `/<name>-<number>-schedule-live-locations/` | Up and down trains are separate, near-duplicate posts. |
| Directional route | ~92 | `/<a>-to-<b>-train-schedule/` (+ some `…-train-ticket-price/`) | `a-to-b` and `b-to-a` are separate posts. |
| Train by name / city | a few | `/<name>-train-schedule/`, `/<city>-train-schedule/` | Overlaps with the per-number pages. |
| Bangla-slug posts | a few | percent-encoded Bangla URLs | Mixed URL languages. |
| Static | 8 | about, contact, privacy, terms, copyright, HTML sitemap, live-location | — |

- Train page: ~670 words, 3 schedule tables, FAQ-style blocks, TrainTrip/TrainStation and
  BreadcrumbList schema, and a Leaflet/OpenStreetMap "live location" map.
- Home: a "find your train" search plus a long list of links to train posts.
- No links to the official e-ticket site or railway.gov.bd were found on the pages checked.
- `dateModified` on a train page was the same day as the visit, so it is likely refreshed
  automatically rather than tied to real data changes.

## How TodaysTrain differs (by design)
1. **One page per train name with both directions** and **one page per route with both
   directions**. That gives far fewer near-duplicate pages, which is safer for AdSense
   "thin/duplicate content" reviews.
2. **English-only, stable URLs** (`/train/<name>/`, `/route/<a>-<b>/`, `/station/<id>/`).
3. **Honest labelling**: positions are "সময়সূচী অনুযায়ী আনুমানিক অবস্থান", never "live".
   Hand-transcribed (scanned) rows are marked ✱. There is a public corrections log. No
   invented fares.
4. **Provenance**: every data page shows the date the data really changed and the source
   documents, and links to the official e-ticket site. The non-affiliation statement is in
   the footer and the disclaimer.
5. **Asia/Dhaka-correct "today" logic**, including trains that run past midnight (off-days
   shift at intermediate stations).
6. **Station pages** for every station served by 12+ trains.
7. **Static and fast**: no CMS, no third-party scripts until ads are approved, and reserved ad
   space so pages stay CLS-safe.

## Gaps to consider later
- Fare pages (they have ticket-price pages). Add these only from an official fare chart.
- East-zone stop lists (pages 5–8 of the scanned PDF), so that East-zone trains get their
  own train pages.
