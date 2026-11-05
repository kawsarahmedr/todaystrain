#!/usr/bin/env python3
"""Parse Bangladesh Railway timetable PDFs into data/generated/*.json.

Usage
  python3 scripts/parse_pdfs.py               write data/generated/
  python3 scripts/parse_pdfs.py --check       exit 1 if committed output is stale
  python3 scripts/parse_pdfs.py --dump-names  list every station/train name seen

Inputs (all under data/)
  sources.json                     registry of source PDFs (text or scanned)
  dictionaries/glyphmap-*.json     glyph maps for PDFs whose fonts lack ToUnicode
  dictionaries/stations.json       canonical stations + Bangla spellings seen in PDFs
  dictionaries/trains.json         English train names (needed for English URLs)
  transcriptions/*.csv             manual transcriptions of scanned PDFs
  overrides.json                   manual corrections and extra (e.g. Eid) trains

Nothing is guessed: unknown glyphs/stations/weekdays are reported, and the
TypeScript validator (scripts/validate-data.ts) fails the build on them.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
import unicodedata
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pdftext import norm_digits, parse_time  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
GEN = DATA / "generated"

WEEKDAYS = {
    "রবিবার": 0, "সোমবার": 1, "মঙ্গলবার": 2, "বুধবার": 3,
    "বৃহস্পতিবার": 4, "শুক্রবার": 5, "শনিবার": 6,
}
NUM_RE = re.compile(r"^[0-9০-৯]{1,4}(?:/[0-9০-৯]{1,4})?$")
TOKEN_RE = re.compile(r"[0-9০-৯]{3,4}|[-–—.]{2,}|-")
DIGITS_ONLY = re.compile(r"^[0-9০-৯\s]+$")


def nfc(s: str) -> str:
    return unicodedata.normalize("NFC", s or "").strip()


def key(s: str) -> str:
    """Matching key for Bangla names: ignore spaces, dots and colon variants."""
    return re.sub(r"[\s.\-]", "", nfc(s)).replace(":", "ঃ")


class Report:
    def __init__(self) -> None:
        self.issues: list[dict] = []

    def add(self, level: str, code: str, message: str, **ctx) -> None:
        self.issues.append({"level": level, "code": code, "message": message, **ctx})


def load_json(path: Path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------- dictionaries
class Stations:
    def __init__(self, path: Path, report: Report) -> None:
        self.items = load_json(path)["stations"]
        self.by_key: dict[str, str] = {}
        self.unknown: dict[str, list] = {}
        self.report = report
        for st in self.items:
            for name in [st["bn"], *st.get("aliases", [])]:
                k = key(name)
                if k in self.by_key and self.by_key[k] != st["id"]:
                    raise SystemExit(f"stations.json: '{name}' maps to two stations")
                self.by_key[k] = st["id"]

    def resolve(self, raw: str, where: dict) -> str:
        k = key(raw)
        if k in self.by_key:
            return self.by_key[k]
        self.unknown.setdefault(nfc(raw), []).append(where)
        return "?" + nfc(raw)


def train_name(raw: str) -> str:
    s = nfc(raw)
    s = re.sub(r"এক্সঃ$", "এক্সপ্রেস", s)
    s = re.sub(r"\s*\.{2,}\s*", " ", s).strip()
    return re.sub(r"\s+", " ", s)


def norm_number(raw: str) -> str:
    return norm_digits(nfc(raw)).replace(" ", "")


def weekday(raw: str | None, report: Report, where: dict) -> int | None:
    s = nfc(raw or "")
    if s in ("", "-", "--", "নেই"):
        return None
    if s in WEEKDAYS:
        return WEEKDAYS[s]
    report.add("error", "unknown-weekday", f"বন্ধের দিন বোঝা যায়নি: {s!r}", **where)
    return None


def safe_time(raw: str | None, report: Report, where: dict) -> str | None:
    try:
        return parse_time(raw)
    except ValueError:
        report.add("error", "bad-time", f"সময় পড়া যায়নি: {raw!r}", **where)
        return None


def classify(section: str, name: str, number: str) -> str:
    if number.startswith("31") and len(number) >= 4:
        return "international"
    if "আন্তঃনগর" in section:
        return "intercity"
    if "লোকাল" in section:
        return "local"
    if "মেইল" in name:
        return "mail"
    if "শাটল" in name:
        return "shuttle"
    return "commuter"


# ------------------------------------------------------- text PDF interpreter
def interpret_text_pdf(src: dict, report: Report) -> dict:
    import extract_tables

    glyph = load_json(ROOT / src["glyphmap"])["map"]
    unknown_glyphs: set[str] = set()
    tables = extract_tables.extract(str(ROOT / src["file"]), glyph, unknown_glyphs)
    for g in sorted(unknown_glyphs):
        report.add("error", "unknown-glyph", f"অজানা গ্লিফ (cid:{g}) — glyphmap হালনাগাদ করুন", source=src["id"])

    trains: list[dict] = []
    offday_summary: dict[str, int] = {}
    station_tables: list[dict] = []
    timetable: dict[str, list[dict]] = {}
    section = ""

    for t in tables:
        rows = t["rows"]
        header = " ".join(c or "" for c in rows[0])
        title = t["title"]
        where0 = {"source": src["id"], "page": t["page"]}
        if "ট্রেনের তালিকা" in title.replace(" ", "") or "ট্রেনেরতালিকা" in title.replace(" ", ""):
            section = title
        if "ট্রেন নং" in header and "বন্ধের দিন" in header or ("রূট" in header and "ট্রেন নং" in header):
            sec = section.replace(" ", "")
            sec_name = (
                "আন্তঃনগর" if "আন্তঃনগর" in sec else "লোকাল" if "লোকাল" in sec else "কমিউটার ও মেইল"
            )
            for ri, row in enumerate(rows[1:], start=1):
                where = {**where0, "row": ri}
                if "রূট" in header:  # local trains: no off-day column, has a route column
                    cells = [c for c in row if c]
                    if len(cells) != 8:
                        report.add("error", "bad-row", f"লোকাল সারি পড়া যায়নি: {cells}", **where)
                        continue
                    serial, num, name, _route, origin, dep, dest, arr = cells
                    off = None
                else:
                    if len(row) != 8 or not row[1]:
                        continue
                    serial, num, name, off_raw, origin, dep, dest, arr = [c or "" for c in row]
                    off = weekday(off_raw, report, where)
                number = norm_number(num)
                tname = train_name(name)
                rec = {
                    "number": number if NUM_RE.match(number) else None,
                    "name": tname,
                    "type": classify(sec_name, tname, number),
                    "section": sec_name,
                    "offDay": off,
                    "originRaw": nfc(origin),
                    "destinationRaw": nfc(dest),
                    "departure": safe_time(dep, report, where),
                    "arrival": safe_time(arr, report, where),
                    "status": "planned" if "প্রস্তাবিত" in nfc(name) else "active",
                    "where": where,
                }
                if rec["number"] is None and nfc(num) == "ডেমু":
                    rec["demu"] = True
                trains.append(rec)
        elif "সাপ্তাহিক বন্ধের সার-সংক্ষেপ" in header:
            current = None
            for row in rows[1:]:
                cells = [c for c in row if c]
                if not cells:
                    continue
                if cells[0] in WEEKDAYS:
                    current = WEEKDAYS[cells[0]]
                    cells = cells[1:]
                if current is None:
                    continue
                for c in dict.fromkeys(cells):  # de-duplicate merged cells
                    for n in re.findall(r"[0-9০-৯]+", c):
                        offday_summary[norm_digits(n)] = current
        elif "পৌঁছার সময়" in header and "প্রারম্ভিক স্টেশন" in header:
            m = re.match(r"(.+?)\s*স্টেশন হতে", title.split("|")[-1].strip())
            if not m:
                report.add("error", "bad-title", f"স্টেশন টেবিলের শিরোনাম বোঝা যায়নি: {title}", **where0)
                continue
            entries = []
            for ri, row in enumerate(rows[1:], start=1):
                cells = [c or "" for c in row]
                if len(cells) != 9 or not cells[1]:
                    continue
                where = {**where0, "row": ri}
                entries.append({
                    "number": norm_number(cells[1]),
                    "name": train_name(cells[2]),
                    "arr": safe_time(cells[3], report, where),
                    "dep": safe_time(cells[4], report, where),
                    "where": where,
                })
            station_tables.append({"stationRaw": m.group(1), "entries": entries, "where": where0})
        elif "সংক্ষিপ্ত" in title.replace(" ", "") or "সংক্ষিপ্তসময়সূচী" in title.replace(" ", ""):
            parse_abbreviated(rows, timetable, report, where0)
    return {"trains": trains, "offdaySummary": offday_summary, "stationTables": station_tables, "timetable": timetable}


def is_header_row(row: list) -> bool:
    if (row[0] or "").strip() or (len(row) > 1 and (row[1] or "").strip()):
        return False
    names = [c for c in row[2:] if c and not DIGITS_ONLY.match(c) and not TOKEN_RE.fullmatch(c.strip())]
    return len(names) > 0 and all(re.search(r"[ঀ-৿]", c) for c in names)


def tokens(cell: str | None) -> list[str]:
    return TOKEN_RE.findall(cell or "")


def tok_time(tok: str | None, report: Report, where: dict) -> str | None:
    if tok is None or re.fullmatch(r"[-–—.]+", tok):
        return None
    return safe_time(tok, report, where)


def parse_abbreviated(rows: list[list], timetable: dict, report: Report, where0: dict) -> None:
    """Blocks = header row (station names) + data rows. Two layouts exist:
    separate arrival/departure rows, or one row with "arr dep" pairs per cell."""
    i = 0
    while i < len(rows):
        if not is_header_row(rows[i]):
            i += 1
            continue
        header = rows[i]
        j = i + 1
        while j < len(rows) and not is_header_row(rows[j]):
            j += 1
        block = rows[i + 1 : j]
        where = {**where0, "row": i}
        number = None
        for r in block:
            if r[0] and NUM_RE.match(norm_number(r[0])):
                number = norm_number(r[0])
                break
        data_rows = [r for r in block if any(tokens(c) for c in r[2:])]
        cols = [k for k in range(2, len(header)) if header[k] and not DIGITS_ONLY.match(header[k])]
        if number is None or not data_rows:
            if number is not None or data_rows:
                report.add("warning", "timetable-block", f"ব্লক অসম্পূর্ণ (ট্রেন {number})", **where)
            i = j
            continue
        # Collect every time token per column across all data rows. Layouts seen:
        # arrival row + departure row, or "arr dep" pairs in one cell (the second
        # value sometimes spills onto an extra row). Row index tells arr vs dep
        # only in the two-row layout.
        pair_layout = any(len(tokens(c)) >= 2 for r in data_rows for c in r[2:])
        stops = []
        for k in cols:
            tk: list[tuple[int, str]] = []
            for ri, r in enumerate(data_rows):
                if k < len(r):
                    tk += [(ri, x) for x in tokens(r[k])]
            if not tk:
                continue
            if len(tk) >= 2:
                arr_t, dep_t = tk[0][1], tk[1][1]
            elif pair_layout:
                arr_t, dep_t = tk[0][1], None
            else:
                arr_t, dep_t = (tk[0][1], None) if tk[0][0] == 0 else (None, tk[0][1])
            arr = tok_time(arr_t, report, where)
            dep = tok_time(dep_t, report, where)
            if arr is None and dep is None:
                continue
            stop = {"stationRaw": nfc(header[k]), "arr": arr, "dep": dep}
            if len(tk) == 1 and pair_layout:
                stop["single"] = True
            stops.append(stop)
        timetable.setdefault(number, []).append({"stops": stops, "where": where})
        i = j


# ---------------------------------------------------- scanned PDF (manual CSV)
def interpret_transcription(src: dict, report: Report) -> dict:
    trains = []
    path = ROOT / src["transcription"]
    with open(path, encoding="utf-8", newline="") as f:
        for ri, row in enumerate(csv.DictReader(f), start=2):
            where = {"source": src["id"], "page": int(row["page"]), "row": int(row["row"]), "csvLine": ri}
            number = norm_number(row["number"])
            name = train_name(row["name"])
            trains.append({
                "number": number if NUM_RE.match(number) else None,
                "name": name,
                "type": row.get("type") or classify("আন্তঃনগর", name, number),
                "section": row.get("section") or "আন্তঃনগর",
                "offDay": weekday(row["off_day"], report, where),
                "originRaw": nfc(row["origin"]),
                "destinationRaw": nfc(row["destination"]),
                "departure": safe_time(row["departure"], report, where),
                "arrival": safe_time(row["arrival"], report, where),
                "status": row.get("status") or "active",
                "verified": row.get("verified", "").strip() in ("1", "true", "yes"),
                "note": nfc(row.get("note", "")) or None,
                "where": where,
            })
    summary: dict[str, int] = {}
    if src.get("offdaySummary"):
        for day, nums in load_json(ROOT / src["offdaySummary"]).items():
            if day in WEEKDAYS:
                for n in nums:
                    summary[n] = WEEKDAYS[day]
    return {"trains": trains, "offdaySummary": summary, "stationTables": [], "timetable": {}}


# ------------------------------------------------------------------- assembly
def mins(t: str) -> int:
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def check_sequence(stops: list[dict], number: str, report: Report, where: dict) -> bool:
    prev = None
    total = 0
    for s in stops:
        for t in (s.get("arr"), s.get("dep")):
            if t is None:
                continue
            if prev is not None:
                delta = (mins(t) - prev) % 1440
                if delta > 12 * 60 and len(stops) == 2:
                    report.add("warning", "long-segment", f"ট্রেন {number}: উৎস থেকে গন্তব্য {delta // 60} ঘণ্টার বেশি", **where)
                elif delta > 12 * 60:
                    report.add("error", "out-of-order", f"ট্রেন {number}: {s['station']} এর সময় {t} আগের স্টপের চেয়ে আগে", **where)
                    return False
                total += delta
            prev = mins(t)
    if total >= 1440:
        report.add("error", "too-long", f"ট্রেন {number}: যাত্রাকাল ২৪ ঘণ্টার বেশি", **where)
        return False
    return True


def build(sources: list[dict], stations: Stations, names: dict, report: Report) -> list[dict]:
    out: list[dict] = []
    seen_ids: dict[str, dict] = {}
    for src in sources:
        parsed = interpret_text_pdf(src, report) if src["kind"] == "text" else interpret_transcription(src, report)
        verified_default = src["kind"] == "text"
        st_rows: dict[str, list[dict]] = {}
        for tbl in parsed["stationTables"]:
            sid = stations.resolve(tbl["stationRaw"], tbl["where"])
            for e in tbl["entries"]:
                st_rows.setdefault(e["number"], []).append({**e, "station": sid})

        for tr in parsed["trains"]:
            where = tr["where"]
            number = tr["number"]
            if number:
                tid = number.split("/")[0]
            else:
                en = names.get("byName", {}).get(tr["name"])
                tid = "demu-" + (en or tr["name"]).lower().replace(" ", "-")
            origin = stations.resolve(tr["originRaw"], where)
            dest = stations.resolve(tr["destinationRaw"], where)
            rec = {
                "id": tid,
                "number": number,
                "name": tr["name"],
                "nameEn": (names["byNumber"].get(number) if number else names.get("byName", {}).get(tr["name"])),
                "type": tr["type"],
                "zone": src["zone"],
                "offDay": tr["offDay"],
                "origin": origin,
                "destination": dest,
                "departure": tr["departure"],
                "arrival": tr["arrival"],
                "stops": [],
                "stopsSource": "endpoints",
                "status": tr["status"],
                "verified": tr.get("verified", verified_default),
                "note": tr.get("note"),
                "source": {"id": src["id"], "page": where["page"], "row": where["row"]},
            }
            if tr.get("demu"):
                rec["demu"] = True
            # ---- stops
            blocks = parsed["timetable"].get(number or "", [])
            if blocks:
                stops = []
                for b in blocks:
                    for s in b["stops"]:
                        stops.append({"station": stations.resolve(s["stationRaw"], b["where"]), "arr": s["arr"], "dep": s["dep"], **({"single": True} if s.get("single") else {})})
                # A lone time at the origin is a departure; at the terminus an arrival.
                if stops and stops[0]["dep"] is None:
                    stops[0]["dep"], stops[0]["arr"] = stops[0]["arr"], None
                if stops and stops[-1]["arr"] is None:
                    stops[-1]["arr"], stops[-1]["dep"] = stops[-1]["dep"], None
                for s_ in stops[1:-1]:
                    if s_.pop("single", False):
                        report.add("warning", "single-time", f"ট্রেন {number}: {s_['station']} এ একটি মাত্র সময় ({s_['arr']})", **where)
                stops[0].pop("single", None)
                stops[-1].pop("single", None)
                rec["stops"] = stops
                rec["stopsSource"] = "timetable"
                first, last = stops[0], stops[-1]
                if first["station"] != origin or first["dep"] != rec["departure"]:
                    report.add("warning", "origin-mismatch", f"ট্রেন {number}: তালিকা {origin} {rec['departure']} বনাম সময়সূচী {first['station']} {first['dep']}", **where)
                if last["station"] != dest or last["arr"] != rec["arrival"]:
                    report.add("warning", "destination-mismatch", f"ট্রেন {number}: তালিকা {dest} {rec['arrival']} বনাম সময়সূচী {last['station']} {last['arr']}", **where)
            else:
                stops = [{"station": origin, "arr": None, "dep": rec["departure"]}]
                extra = []
                if rec["departure"]:
                    for e in st_rows.get(number or "", []):
                        if e["station"] in (origin, dest):
                            continue
                        t = e["arr"] or e["dep"]
                        if t:
                            extra.append(((mins(t) - mins(rec["departure"])) % 1440, {"station": e["station"], "arr": e["arr"], "dep": e["dep"]}))
                total = (mins(rec["arrival"]) - mins(rec["departure"])) % 1440 if rec["arrival"] and rec["departure"] else None
                for el, s in sorted(extra, key=lambda x: x[0]):
                    if total is not None and el > total:
                        report.add("warning", "station-table-outside", f"ট্রেন {number}: {s['station']} এর সময় যাত্রাকালের বাইরে", **where)
                        continue
                    if not any(x["station"] == s["station"] for x in stops):
                        stops.append(s)
                stops.append({"station": dest, "arr": rec["arrival"], "dep": None})
                rec["stops"] = stops
                if extra:
                    rec["stopsSource"] = "station-tables"
            # cross-check station tables against the timetable
            if blocks:
                for e in st_rows.get(number or "", []):
                    match = next((s for s in rec["stops"] if s["station"] == e["station"]), None)
                    if match and ((e["arr"] and match["arr"] and e["arr"] != match["arr"]) or (e["dep"] and match["dep"] and e["dep"] != match["dep"])):
                        report.add("warning", "station-table-mismatch", f"ট্রেন {number} @ {e['station']}: স্টেশন টেবিল {e['arr']}/{e['dep']} বনাম সময়সূচী {match['arr']}/{match['dep']}", **e["where"])
            # off-day cross-check with the weekly summary table
            summ = parsed["offdaySummary"]
            if number and summ and rec["status"] == "active":
                nums = number.split("/")
                s_off = next((summ[n] for n in nums if n in summ), None)
                if s_off != rec["offDay"] and not (s_off is None and rec["offDay"] is None):
                    report.add("warning", "offday-summary-mismatch", f"ট্রেন {number}: তালিকায় বন্ধ {rec['offDay']}, সার-সংক্ষেপে {s_off}", **where)
            if tid in seen_ids:
                report.add("error", "duplicate-train", f"ট্রেন {tid} একাধিকবার আছে", **where)
                continue
            seen_ids[tid] = rec
            out.append(rec)
        # numbers in the off-day summary that are not in any list
        known = {n for r in out for n in (r["number"] or "").split("/")}
        for n in parsed["offdaySummary"]:
            if n not in known:
                report.add("warning", "summary-unknown-train", f"সার-সংক্ষেপে ট্রেন {n} আছে, তালিকায় নেই", source=src["id"])
    return out


# ------------------------------------------------------------------ overrides
def apply_overrides(trains: list[dict], overrides: dict, report: Report) -> list[dict]:
    by_id = {t["id"]: t for t in trains}
    for p in overrides.get("trains", {}).get("patch", []):
        t = by_id.get(p["id"])
        if not t:
            report.add("error", "override-unknown", f"overrides: ট্রেন {p['id']} পাওয়া যায়নি")
            continue
        t.update(p["set"])
        t.setdefault("overrides", []).append(p.get("reason", ""))
    for p in overrides.get("trains", {}).get("stopPatch", []):
        t = by_id.get(p["id"])
        stop = next((x for x in (t or {}).get("stops", []) if x["station"] == p["station"]), None)
        if not stop:
            report.add("error", "override-unknown", f"overrides: ট্রেন {p['id']} এর স্টপ {p['station']} পাওয়া যায়নি")
            continue
        stop.update(p["set"])
        t.setdefault("overrides", []).append(p.get("reason", ""))
    for r in overrides.get("trains", {}).get("remove", []):
        if r["id"] not in by_id:
            report.add("error", "override-unknown", f"overrides: ট্রেন {r['id']} পাওয়া যায়নি")
        by_id.pop(r["id"], None)
    for a in overrides.get("trains", {}).get("add", []):
        if a["id"] in by_id:
            report.add("error", "override-duplicate", f"overrides: ট্রেন {a['id']} আগে থেকেই আছে")
            continue
        by_id[a["id"]] = {"stopsSource": "override", "verified": True, "overrides": ["added"], **a}
    return sorted(by_id.values(), key=lambda t: (t["zone"], t["type"], int(re.sub(r"\D", "", t["number"] or "0") or 0), t["id"]))


# ----------------------------------------------------------------------- main
def dumps(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=False) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--dump-names", action="store_true")
    args = ap.parse_args()

    report = Report()
    sources = load_json(DATA / "sources.json")["sources"]
    stations = Stations(DATA / "dictionaries" / "stations.json", report)
    names = load_json(DATA / "dictionaries" / "trains.json")
    trains = build(sources, stations, names, report)
    trains = apply_overrides(trains, load_json(DATA / "overrides.json"), report)
    for t in trains:
        check_sequence(t["stops"], t["number"] or t["id"], report, t.get("source", {}))

    for raw, wheres in sorted(stations.unknown.items()):
        report.add("error", "unknown-station", f"অজানা স্টেশন: {raw}", occurrences=len(wheres), first=wheres[0])
    for t in trains:
        if t["type"] == "intercity" and t["status"] == "active" and not t.get("nameEn"):
            report.add("error", "missing-english-name", f"ট্রেন {t['id']} ({t['name']}) এর ইংরেজি নাম নেই (URL-এর জন্য দরকার)")

    if args.dump_names:
        for raw, wheres in sorted(stations.unknown.items(), key=lambda x: -len(x[1])):
            print(f"{len(wheres):4d}  {raw}")
        return 0

    used = {s["station"] for t in trains for s in t["stops"]} | {t["origin"] for t in trains} | {t["destination"] for t in trains}
    station_out = [s for s in stations.items if s["id"] in used]
    payload = {
        "trains.json": dumps({"trains": trains}),
        "stations.json": dumps({"stations": station_out}),
        "report.json": dumps({"issues": report.issues}),
    }
    digest = hashlib.sha256("".join(payload[k] for k in ("trains.json", "stations.json")).encode()).hexdigest()
    meta_path = GEN / "meta.json"
    old_meta = load_json(meta_path) if meta_path.exists() else {}
    if old_meta.get("contentHash") == digest:
        last_updated = old_meta["lastUpdated"]
    else:  # data changed: stamp today's date in Asia/Dhaka
        last_updated = (datetime.now(timezone.utc) + timedelta(hours=6)).date().isoformat()
    meta = {
        "lastUpdated": last_updated,
        "contentHash": digest,
        "sources": [{k: s[k] for k in ("id", "title", "zone", "kind", "file", "sha256", "documentDate") if k in s} for s in sources],
        "counts": {
            "trains": len(trains),
            "stations": len(station_out),
            "errors": sum(i["level"] == "error" for i in report.issues),
            "warnings": sum(i["level"] == "warning" for i in report.issues),
        },
    }
    payload["meta.json"] = dumps(meta)

    if args.check:
        stale = [n for n, body in payload.items() if not (GEN / n).exists() or (GEN / n).read_text(encoding="utf-8") != body]
        if stale:
            print("Generated data is stale; run `npm run data:parse` and commit:", ", ".join(stale))
            return 1
        print("Generated data is up to date.")
        return 0

    GEN.mkdir(parents=True, exist_ok=True)
    for name, body in payload.items():
        (GEN / name).write_text(body, encoding="utf-8")
    errors = meta["counts"]["errors"]
    print(f"trains={len(trains)} stations={len(station_out)} errors={errors} warnings={meta['counts']['warnings']}")
    for i in report.issues:
        if i["level"] == "error":
            print("  ERROR", i["code"], i["message"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
