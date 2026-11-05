"""Bangla text recovery for PDFs whose conjunct glyphs lack ToUnicode entries.

pdfminer reports such glyphs as "(cid:N)". We map them with a per-PDF glyph map,
then convert visual glyph order (as drawn in the content stream) to logical
Unicode order: reph (র্) is moved before its base cluster and pre-base vowel
signs (ি ে ৈ) are moved after the consonant cluster they belong to.
"""
from __future__ import annotations

import re
import unicodedata

CID_RE = re.compile(r"\(cid:(\d+)\)")
REPH = ""
CONS = "ক-হৎড়-য়"
CLUSTER = re.compile(f"([{CONS}]়?(?:্[{CONS}]়?)*)(ঁ?)")
VOWEL_SIGNS = set("ািীুূৃেৈোৌৗঁংঃ")
PRE_BASE = {"ি", "ে", "ৈ"}
BN_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")


class GlyphError(ValueError):
    pass


def _apply_reph(text: str) -> str:
    out = ""
    for ch in text:
        if ch != REPH:
            out += ch
            continue
        j = len(out)
        while j > 0 and out[j - 1] in VOWEL_SIGNS:
            j -= 1
        k = j
        # walk back over a consonant cluster: C (় ) (্ C (়))*
        while k > 0:
            c = out[k - 1]
            if c == "়" or c == "্" or re.match(f"[{CONS}]", c):
                k -= 1
                if c not in ("়", "্") and (k == 0 or out[k - 1] != "্"):
                    break
            else:
                break
        out = out[:k] + "র্" + out[k:]
    return out


def _reorder_prebase(text: str) -> str:
    out = []
    i = 0
    while i < len(text):
        ch = text[i]
        if ch in PRE_BASE:
            m = CLUSTER.match(text, i + 1)
            if m:
                cluster, candra = m.group(1), m.group(2)
                nxt = m.end()
                if ch == "ে" and text[nxt : nxt + 1] == "া":
                    out.append(cluster + "ো" + candra)
                    i = nxt + 1
                    continue
                if ch == "ে" and text[nxt : nxt + 1] == "ৗ":
                    out.append(cluster + "ৌ" + candra)
                    i = nxt + 1
                    continue
                out.append(cluster + ch + candra)
                i = nxt
                continue
        out.append(ch)
        i += 1
    return "".join(out)


def decode(raw: str, glyphmap: dict[str, str], unknown: set[str] | None = None) -> str:
    def sub(m: re.Match) -> str:
        g = glyphmap.get(m.group(1))
        if g is None:
            if unknown is not None:
                unknown.add(m.group(1))
            return "�"
        return REPH if g == "REPH" else g

    text = unicodedata.normalize("NFC", CID_RE.sub(sub, raw))
    text = _reorder_prebase(_apply_reph(text))
    text = re.sub(r"\s+", " ", text).strip()
    return unicodedata.normalize("NFC", text)


def norm_digits(s: str) -> str:
    return s.translate(BN_DIGITS)


def parse_time(s: str | None) -> str | None:
    """'1015' / '০৯৫০' / '11৪৫' -> '10:15'. Returns None for blanks/dashes."""
    if not s:
        return None
    d = re.sub(r"[^0-9]", "", norm_digits(s))
    if not d:
        return None
    if len(d) == 3:
        d = "0" + d
    if len(d) != 4:
        raise ValueError(f"bad time {s!r}")
    hh, mm = int(d[:2]), int(d[2:])
    if hh > 23 or mm > 59:
        raise ValueError(f"bad time {s!r}")
    return f"{hh:02d}:{mm:02d}"
