"""Positional table extraction for text-based PDFs (pdfplumber cell grid +
stream-order glyph decoding per cell)."""
from __future__ import annotations

import pdfplumber

from pdftext import decode


def _inside(ch: dict, bbox: tuple[float, float, float, float]) -> bool:
    cx = (ch["x0"] + ch["x1"]) / 2
    cy = (ch["top"] + ch["bottom"]) / 2
    x0, top, x1, bottom = bbox
    return x0 <= cx <= x1 and top <= cy <= bottom


def extract(pdf_path: str, glyphmap: dict[str, str], unknown: set[str]) -> list[dict]:
    """Return a list of {page, index, title, bbox, rows} for every table.

    `title` is the decoded text of the non-table lines directly above the table.
    """
    tables_out: list[dict] = []
    with pdfplumber.open(pdf_path) as pdf:
        for pno, page in enumerate(pdf.pages, start=1):
            chars = page.chars  # content-stream order
            tables = page.find_tables()
            boxes = [t.bbox for t in tables]
            # text lines outside tables (titles, notes, page labels)
            free = [c for c in chars if not any(_inside(c, b) for b in boxes)]
            lines: dict[int, list[dict]] = {}
            for c in free:
                lines.setdefault(round(c["top"] / 3), []).append(c)
            free_lines = []
            for key in sorted(lines):
                cs = lines[key]
                txt = decode("".join(c["text"] for c in cs), glyphmap, unknown)
                if txt:
                    free_lines.append((min(c["top"] for c in cs), txt))
            for ti, t in enumerate(tables):
                rows = []
                for r in t.rows:
                    row = []
                    for cell in r.cells:
                        if cell is None:
                            row.append(None)
                            continue
                        cs = [c for c in chars if _inside(c, cell)]
                        row.append(decode("".join(c["text"] for c in cs), glyphmap, unknown))
                    rows.append(row)
                top = t.bbox[1]
                prev_bottom = max([b[3] for b in boxes if b[3] <= top + 1 and b != t.bbox] or [0])
                title = " | ".join(txt for y, txt in free_lines if prev_bottom - 1 <= y < top)
                tables_out.append(
                    {"page": pno, "index": ti, "title": title, "bbox": [round(v, 1) for v in t.bbox], "rows": rows}
                )
    return tables_out
