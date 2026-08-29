#!/usr/bin/env python3
"""
Fetch readable MSOA names from the House of Commons Library `msoanames` dataset
and filter them down to the codes this project actually renders.

Two vintages are published and both are needed:
  * MSOA-Names-Latest2.csv -> msoa21cd / msoa21hclnm  (2021 codes)
  * MSOA-Names-Latest.csv  -> msoa11cd / msoa11hclnm  (2011 codes)

The like-for-like table is keyed on the 2011 footprint, so its split-parent row
(E02000664) has no 2021 code and therefore no 2021 name. The 2011 file supplies
the House of Commons Library's own published name for exactly that footprint.
No name is ever composed or invented - a code with no published name is simply
omitted, and the UI falls back to showing the code.

Writes data/msoa_names.json: {code: name}. Raw downloads are cached to
data/raw/ so reruns do not re-hit the site. A failed fetch raises.
"""

from __future__ import annotations

import csv
import io
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
RAW = DATA / "raw"

BASE = "https://houseofcommonslibrary.github.io/msoanames"
FILES = {
    "2021": ("MSOA-Names-Latest2.csv", "msoa21cd", "msoa21hclnm"),
    "2011": ("MSOA-Names-Latest.csv", "msoa11cd", "msoa11hclnm"),
}

SESSION = requests.Session()
SESSION.headers["User-Agent"] = "lewisham-overcrowding-evidence-pack/1.0"

PROVENANCE: list[dict] = []


def fetch(url: str, cache_name: str, source: str) -> str:
    RAW.mkdir(parents=True, exist_ok=True)
    path = RAW / cache_name
    meta_path = RAW / (cache_name + ".meta.json")

    if path.exists() and path.stat().st_size > 0:
        meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
        PROVENANCE.append(
            {
                "source": source,
                "url": meta.get("url", url),
                "retrieved": meta.get("retrieved", "unknown"),
                "cached": True,
                "file": str(path.relative_to(ROOT)),
                "bytes": path.stat().st_size,
            }
        )
        return path.read_text(encoding="utf-8-sig")

    resp = SESSION.get(url, timeout=180)
    if resp.status_code != 200:
        raise RuntimeError(
            f"Fetch failed for {source}: HTTP {resp.status_code}\n  URL: {resp.url}"
        )
    if not resp.content:
        raise RuntimeError(f"Fetch returned an EMPTY body for {source}: {resp.url}")

    path.write_bytes(resp.content)
    retrieved = datetime.now(timezone.utc).isoformat(timespec="seconds")
    meta_path.write_text(json.dumps({"url": resp.url, "retrieved": retrieved}, indent=2))
    PROVENANCE.append(
        {
            "source": source,
            "url": resp.url,
            "retrieved": retrieved,
            "cached": False,
            "file": str(path.relative_to(ROOT)),
            "bytes": len(resp.content),
        }
    )
    return resp.content.decode("utf-8-sig")


def main() -> int:
    print("=" * 78)
    print("MSOA NAMES - House of Commons Library msoanames dataset")
    print("=" * 78)

    geo_path = DATA / "lewisham_msoa.geojson"
    lfl_path = DATA / "lewisham_overcrowding_like_for_like.csv"
    for p in (geo_path, lfl_path):
        if not p.exists():
            raise RuntimeError(f"Missing {p} - run fetch_data.py first.")

    geo = json.loads(geo_path.read_text())
    wanted = {f["properties"]["MSOA21CD"] for f in geo["features"]}
    lfl = list(csv.DictReader(lfl_path.open()))
    wanted |= {r["msoa21cd"] for r in lfl}
    print(f"\n  Codes to resolve: {len(wanted)} "
          f"({len(geo['features'])} polygons + {len(lfl)} table rows, deduplicated)")

    names: dict[str, str] = {}
    for vintage, (fname, code_col, name_col) in FILES.items():
        text = fetch(f"{BASE}/{fname}", fname, f"HoC Library MSOA names, {vintage} vintage")
        rows = list(csv.DictReader(io.StringIO(text)))
        if code_col not in (rows[0].keys() if rows else {}):
            raise RuntimeError(
                f"{fname}: expected column {code_col!r}, got {list(rows[0].keys())}"
            )
        hit = 0
        for r in rows:
            code = r[code_col].strip()
            name = (r[name_col] or "").strip()
            # 2021 names win; only fall back to the 2011 file for codes the
            # 2021 file does not carry (i.e. the split parent).
            if code in wanted and name and code not in names:
                names[code] = name
                hit += 1
        print(f"  {fname}: {len(rows):,} rows -> {hit} matched")

    missing = sorted(wanted - set(names))
    print(f"\n  Resolved {len(names)}/{len(wanted)} codes")
    if missing:
        print(f"  No published name (UI will show the code): {missing}")

    out = DATA / "msoa_names.json"
    out.write_text(json.dumps(dict(sorted(names.items())), indent=2, ensure_ascii=False))
    print(f"  Written {out.relative_to(ROOT)}")

    print("\n  Sample:")
    for code in sorted(names)[:5]:
        print(f"    {code}  {names[code]}")
    if "E02000664" in names:
        print(f"    {'E02000664'}  {names['E02000664']}   <- split parent, 2011 vintage")

    prov_path = DATA / "provenance.json"
    existing = json.loads(prov_path.read_text()) if prov_path.exists() else []
    existing = [p for p in existing if "msoanames" not in p.get("url", "")]
    prov_path.write_text(json.dumps(existing + PROVENANCE, indent=2))

    print("\n  PROVENANCE")
    for p in PROVENANCE:
        print(f"    {p['source']}")
        print(f"      {p['url']}")
        print(f"      retrieved {p['retrieved']} ({'cached' if p['cached'] else 'fetched'}), "
              f"{p['bytes']:,} bytes")
    print(f"\n  Appended to {prov_path.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
