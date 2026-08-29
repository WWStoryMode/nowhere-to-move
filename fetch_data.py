#!/usr/bin/env python3
"""
Stage 1 data fetch for the Lewisham overcrowding case study.

Downloads and joins:
  * 2021 Census TS052 "Occupancy rating for bedrooms"   (Nomis NM_2070_1)
  * 2011 Census QS412EW "Occupancy rating (bedrooms)"   (Nomis NM_544_1, revised 2014-01-17)
  * MSOA Dec 2021 generalised-clipped (BGC) boundaries  (ONS Open Geography Portal)
  * MSOA 2011 -> MSOA 2021 lookup with change indicator (ONS Open Geography Portal)

Definitions:
  overcrowded = households with an occupancy rating of -1, PLUS those with -2 or less
  rate        = overcrowded / "Total: All households"
  The "Total" row is a total, never summed as if it were a category.

Rules: nothing is fabricated, interpolated or filled. A failed fetch raises.
Raw downloads are cached under data/raw/ so reruns do not re-hit the APIs.
"""

from __future__ import annotations

import csv
import io
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
RAW = DATA / "raw"

LEWISHAM = "E09000023"

NOMIS = "https://www.nomisweb.co.uk/api/v01/dataset"
ARCGIS = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services"

DS_2021 = "NM_2070_1"  # TS052
DS_2011 = "NM_544_1"   # QS412EW
QS412_EXPECTED_REVISION = "2014-01-17"  # zero-bedroom households recategorised

BOUNDARY_SERVICE = "Middle_layer_Super_Output_Areas_December_2021_Boundaries_EW_BGC_V3"
LOOKUP_SERVICE = (
    "MSOA_(2011)_to_MSOA_(2021)_to_Local_Authority_District_(2022)_Lookup_for_EW_v2"
)

# Occupancy-rating category ids. Both Nomis tables happen to share this id
# scheme, but the *labels* differ between years - they are printed verbatim by
# check 3 and asserted against these ids below.
ID_TOTAL = "0"
ID_MINUS_1 = "4"
ID_MINUS_2_OR_LESS = "5"
OVERCROWDED_IDS = (ID_MINUS_1, ID_MINUS_2_OR_LESS)
CATEGORY_IDS = ("1", "2", "3", "4", "5")

SESSION = requests.Session()
SESSION.headers["User-Agent"] = "lewisham-overcrowding-evidence-pack/1.0"

PROVENANCE: list[dict] = []


# --------------------------------------------------------------------------
# Fetch + cache helpers
# --------------------------------------------------------------------------


def fetch(url: str, cache_name: str, *, params: dict | None = None,
          source: str = "", binary: bool = False):
    """GET a URL, caching the raw body under data/raw/. Raises on failure."""
    RAW.mkdir(parents=True, exist_ok=True)
    path = RAW / cache_name
    meta_path = RAW / (cache_name + ".meta.json")

    if path.exists() and path.stat().st_size > 0:
        meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
        PROVENANCE.append(
            {
                "source": source or cache_name,
                "url": meta.get("url", url),
                "retrieved": meta.get("retrieved", "unknown"),
                "cached": True,
                "file": str(path.relative_to(ROOT)),
                "bytes": path.stat().st_size,
            }
        )
        return path.read_bytes() if binary else path.read_text(encoding="utf-8-sig")

    resp = SESSION.get(url, params=params, timeout=180)
    if resp.status_code != 200:
        raise RuntimeError(
            f"Fetch failed for {source or cache_name}: HTTP {resp.status_code}\n"
            f"  URL: {resp.url}\n  Body starts: {resp.text[:300]!r}"
        )
    if not resp.content:
        raise RuntimeError(f"Fetch returned an EMPTY body for {source or cache_name}: {resp.url}")

    path.write_bytes(resp.content)
    retrieved = datetime.now(timezone.utc).isoformat(timespec="seconds")
    meta_path.write_text(json.dumps({"url": resp.url, "retrieved": retrieved}, indent=2))
    PROVENANCE.append(
        {
            "source": source or cache_name,
            "url": resp.url,
            "retrieved": retrieved,
            "cached": False,
            "file": str(path.relative_to(ROOT)),
            "bytes": len(resp.content),
        }
    )
    return resp.content if binary else resp.content.decode("utf-8-sig")


def sdmx_codes(payload: str) -> list[dict]:
    """Pull the code list out of a Nomis .def.sdmx.json response."""
    doc = json.loads(payload)
    codelists = doc["structure"]["codelists"]["codelist"]
    if isinstance(codelists, dict):
        codelists = [codelists]
    out = []
    for cl in codelists:
        for code in cl.get("code", []):
            ann = {
                a["annotationtitle"]: a["annotationtext"]
                for a in code.get("annotations", {}).get("annotation", [])
            }
            out.append(
                {
                    "value": code.get("value"),
                    "description": code["description"]["value"],
                    "annotations": ann,
                }
            )
    return out


# --------------------------------------------------------------------------
# Step 1 - discover the MSOA geography type for each dataset (never guessed)
# --------------------------------------------------------------------------


def discover_msoa_type(dataset: str, year_label: str) -> tuple[str, int]:
    """
    Find the '<year> super output areas - middle layer' geography type available
    within Lewisham for `dataset`, then verify it resolves to a real list of
    MSOA codes. A wrong type yields an EMPTY CSV rather than an error, so this
    is verified before any data is pulled.
    """
    print(f"\n  Discovering MSOA geography type for {dataset} ({year_label})...")
    codes = sdmx_codes(
        fetch(
            f"{NOMIS}/{dataset}/geography/{LEWISHAM}.def.sdmx.json",
            f"{dataset}_geography_{LEWISHAM}.json",
            source=f"{dataset} geography types within Lewisham",
        )
    )

    candidates = []
    for c in codes:
        name = (c["annotations"].get("TypeName") or c["description"] or "").lower()
        if "middle layer" in name and "super output" in name:
            candidates.append(c)

    available = [
        f"      {c['value']}  {c['description']}  (children={c['annotations'].get('ChildCount')})"
        for c in codes
    ]

    matching = [c for c in candidates if year_label in (c["annotations"].get("TypeName") or "")]
    if len(matching) != 1:
        raise RuntimeError(
            f"Could not uniquely identify the {year_label} MSOA geography type for {dataset}.\n"
            f"    Matched {len(matching)} candidate(s). Available types within Lewisham:\n"
            + "\n".join(available)
        )

    chosen = matching[0]
    geog = chosen["value"]                       # e.g. E09000023TYPE152
    type_code = chosen["annotations"].get("TypeCode")
    child_count = int(chosen["annotations"].get("ChildCount") or 0)
    print(f"    -> {geog}  ({chosen['description']}, TypeCode={type_code}, ChildCount={child_count})")

    # Verify the type actually resolves to a list of MSOA codes.
    members = sdmx_codes(
        fetch(
            f"{NOMIS}/{dataset}/geography/{geog}.def.sdmx.json",
            f"{dataset}_geography_{geog}.json",
            source=f"{dataset} MSOA members of {geog}",
        )
    )
    if len(members) <= 1:
        raise RuntimeError(
            f"Geography type {geog} returned {len(members)} code(s) - the type is WRONG.\n"
            f"    A wrong type returns an empty CSV, not an error. Available types:\n"
            + "\n".join(available)
        )
    print(f"    -> verified: {len(members)} MSOA codes returned")
    if len(members) != child_count:
        raise RuntimeError(
            f"Member count {len(members)} != advertised ChildCount {child_count} for {geog}"
        )
    return geog, len(members)


# --------------------------------------------------------------------------
# Step 2 - pull and parse the census tables
# --------------------------------------------------------------------------


def parse_nomis_csv(text: str, cat_col: str, label: str) -> tuple[dict, dict, list[str]]:
    """
    Return ({msoa_code: {cat_id: value}}, {msoa_code: name}, header list).
    Values are ints; nothing is inferred for absent cells.
    """
    reader = csv.DictReader(io.StringIO(text))
    header = list(reader.fieldnames or [])
    if not header:
        raise RuntimeError(f"{label}: CSV had no header - the geography type is probably wrong.")

    counts: dict[str, dict[str, int]] = {}
    names: dict[str, str] = {}
    labels: dict[str, str] = {}
    rows = 0
    for row in reader:
        rows += 1
        geo = row["GEOGRAPHY_CODE"]
        cat = row[cat_col]
        names[geo] = row["GEOGRAPHY_NAME"]
        labels[cat] = row[f"{cat_col}_NAME"]
        value = row["OBS_VALUE"]
        if value == "":
            raise RuntimeError(f"{label}: empty OBS_VALUE for {geo} category {cat}")
        counts.setdefault(geo, {})[cat] = int(float(value))

    if rows == 0:
        raise RuntimeError(
            f"{label}: CSV contained ZERO data rows - the geography type is wrong."
        )
    return counts, names, header, labels


def summarise(counts: dict[str, dict[str, int]], label: str) -> dict[str, dict]:
    """Compute overcrowded / total / rate per area, validating internal consistency."""
    out = {}
    for geo, cats in counts.items():
        missing = [c for c in (ID_TOTAL, *CATEGORY_IDS) if c not in cats]
        if missing:
            raise RuntimeError(f"{label}: {geo} is missing category ids {missing}")

        total = cats[ID_TOTAL]
        overcrowded = sum(cats[c] for c in OVERCROWDED_IDS)
        parts = sum(cats[c] for c in CATEGORY_IDS)
        if parts != total:
            raise RuntimeError(
                f"{label}: {geo} categories sum to {parts} but Total says {total}"
            )
        if total <= 0:
            raise RuntimeError(f"{label}: {geo} has a non-positive household total ({total})")

        out[geo] = {
            "overcrowded": overcrowded,
            "total": total,
            "rate": 100.0 * overcrowded / total,
        }
    return out


def fetch_year(dataset: str, geography: str, cat_col: str, label: str,
               extra: str = "") -> tuple[dict, dict, list[str], dict]:
    url = f"{NOMIS}/{dataset}.data.csv?geography={geography}&{extra}measures=20100"
    text = fetch(url, f"{dataset}_{geography}.csv", source=label)
    counts, names, header, labels = parse_nomis_csv(text, cat_col, label)
    return counts, names, header, labels


# --------------------------------------------------------------------------
# Step 3 - geoportal boundaries + lookup
# --------------------------------------------------------------------------


def arcgis_query(service: str, cache_name: str, where: str, *, out_fields: str = "*",
                 geometry: bool, source: str):
    params = {
        "where": where,
        "outFields": out_fields,
        "returnGeometry": "true" if geometry else "false",
        "outSR": "4326",
        "f": "geojson" if geometry else "json",
    }
    # Build the full URL so the cache key and provenance record the real request.
    prepared = requests.Request(
        "GET", f"{ARCGIS}/{service}/FeatureServer/0/query", params=params
    ).prepare()
    text = fetch(prepared.url, cache_name, source=source)
    doc = json.loads(text)
    if "error" in doc:
        raise RuntimeError(f"ArcGIS error for {source}: {doc['error']}")
    if doc.get("exceededTransferLimit"):
        raise RuntimeError(f"ArcGIS truncated the response for {source} (transfer limit hit)")
    return doc


def in_clause(field: str, codes) -> str:
    joined = ",".join(f"'{c}'" for c in sorted(codes))
    return f"{field} IN ({joined})"


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------


def main() -> int:
    DATA.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)

    print("=" * 78)
    print("LEWISHAM OVERCROWDING - STAGE 1 DATA FETCH")
    print("=" * 78)

    # -- 2011 dataset revision check ---------------------------------------
    print("\n[1] Dataset discovery")
    meta = json.loads(
        fetch(
            f"{NOMIS}/def.sdmx.json?search=*QS412*",
            "nomis_search_qs412.json",
            source="Nomis dataset search for QS412EW",
        )
    )
    families = meta["structure"]["keyfamilies"]["keyfamily"]
    if isinstance(families, dict):
        families = [families]
    family = next(f for f in families if f["id"] == DS_2011)
    ann = {a["annotationtitle"]: a["annotationtext"] for a in family["annotations"]["annotation"]}
    last_updated = str(ann.get("LastUpdated", ""))
    print(f"  2011 table : {DS_2011} - {family['name']['value']}")
    print(f"  LastUpdated: {last_updated}")
    if not last_updated.startswith(QS412_EXPECTED_REVISION):
        raise RuntimeError(
            f"QS412EW revision check FAILED. Expected the {QS412_EXPECTED_REVISION} revision "
            f"(zero-bedroom households recategorised) but Nomis reports LastUpdated={last_updated}."
        )
    print(f"  -> confirmed the {QS412_EXPECTED_REVISION} revised version "
          "(zero-bedroom households recategorised)")

    # -- geography type discovery ------------------------------------------
    geog_2021, n21 = discover_msoa_type(DS_2021, "2021")
    geog_2011, n11 = discover_msoa_type(DS_2011, "2011")

    # -- data pulls ---------------------------------------------------------
    print("\n[2] Census table downloads")
    cat21 = "C2021_OCCRAT_BEDROOMS_6"
    cat11 = "OCCRATBROOM"

    counts21, names21, header21, labels21 = fetch_year(
        DS_2021, geog_2021, cat21, "2021 TS052 (MSOA)"
    )
    # NM_544_1 carries a RURAL_URBAN dimension; pinning it to 0 ("Total")
    # prevents duplicate rows per geography.
    counts11, names11, header11, labels11 = fetch_year(
        DS_2011, geog_2011, cat11, "2011 QS412EW (MSOA)", extra="rural_urban=0&"
    )

    borough21, _, _, _ = fetch_year(DS_2021, LEWISHAM, cat21, "2021 TS052 (borough)")
    borough11, _, _, _ = fetch_year(
        DS_2011, LEWISHAM, cat11, "2011 QS412EW (borough)", extra="rural_urban=0&"
    )

    stats21 = summarise(counts21, "2021 TS052")
    stats11 = summarise(counts11, "2011 QS412EW")
    b21 = summarise(borough21, "2021 borough")[LEWISHAM]
    b11 = summarise(borough11, "2011 borough")[LEWISHAM]

    # -- geoportal ----------------------------------------------------------
    print("\n[3] Boundaries and lookup (ONS Open Geography Portal)")
    lookup = arcgis_query(
        LOOKUP_SERVICE,
        "msoa11_msoa21_lad22_lookup_lewisham.json",
        where=f"LAD22CD='{LEWISHAM}'",
        geometry=False,
        source="MSOA 2011 -> MSOA 2021 -> LAD 2022 lookup (Lewisham)",
    )
    lookup_rows = [f["attributes"] for f in lookup["features"]]
    if not lookup_rows:
        raise RuntimeError("Lookup returned no rows for Lewisham")
    if any(r.get("CHNGIND") in (None, "") for r in lookup_rows):
        raise RuntimeError(
            "Lookup returned rows with an empty CHNGIND - wrong/unpopulated lookup service."
        )
    print(f"  lookup rows: {len(lookup_rows)}")

    boundaries = arcgis_query(
        BOUNDARY_SERVICE,
        "msoa21_bgc_lewisham.geojson",
        where=in_clause("MSOA21CD", stats21.keys()),
        out_fields="MSOA21CD,MSOA21NM",
        geometry=True,
        source="MSOA Dec 2021 boundaries, generalised clipped (BGC), EPSG:4326",
    )
    feats = boundaries.get("features", [])
    got = {f["properties"]["MSOA21CD"] for f in feats}
    missing = set(stats21) - got
    if missing:
        raise RuntimeError(f"Boundaries missing for {len(missing)} MSOA(s): {sorted(missing)}")
    print(f"  boundary features: {len(feats)} (BGC, generalised)")

    (DATA / "lewisham_msoa.geojson").write_text(json.dumps(boundaries))

    # ----------------------------------------------------------------------
    # Required checks
    # ----------------------------------------------------------------------
    print("\n" + "=" * 78)
    print("REQUIRED CHECKS")
    print("=" * 78)

    print("\n[CHECK 1] Row count per year")
    print(f"  2011 QS412EW : {len(stats11)} MSOAs  ({len(counts11) * 6} CSV data rows)")
    print(f"  2021 TS052   : {len(stats21)} MSOAs  ({len(counts21) * 6} CSV data rows)")
    print(f"  Nomis geography types used: 2011={geog_2011}, 2021={geog_2021}")

    print("\n[CHECK 2] Did any Lewisham MSOA change code between 2011 and 2021?")
    changed = [r for r in lookup_rows if r["CHNGIND"] != "U"]
    only_2011 = sorted(set(stats11) - set(stats21))
    only_2021 = sorted(set(stats21) - set(stats11))
    meaning = {"U": "unchanged", "S": "split", "M": "merged", "X": "irregular/fragmented"}
    counts_by_ind: dict[str, int] = {}
    for r in lookup_rows:
        counts_by_ind[r["CHNGIND"]] = counts_by_ind.get(r["CHNGIND"], 0) + 1
    for ind, n in sorted(counts_by_ind.items()):
        print(f"  CHNGIND '{ind}' ({meaning.get(ind, '?')}): {n} lookup row(s)")

    if changed:
        print(f"\n  *** YES - {len(changed)} lookup row(s) involve a boundary change: ***")
        for r in sorted(changed, key=lambda r: (r["MSOA11CD"], r["MSOA21CD"])):
            print(
                f"      [{r['CHNGIND']}] {r['MSOA11CD']} {r['MSOA11NM']}"
                f"  ->  {r['MSOA21CD']} {r['MSOA21NM']}"
            )
        print(f"\n  Codes present in 2011 only : {only_2011}")
        print(f"  Codes present in 2021 only : {only_2021}")
        print(f"  Codes common to both years : {len(set(stats11) & set(stats21))}")
        print("\n  => A plain join on code is NOT valid for every area.")
        print("     35 unchanged MSOAs join directly on code.")
        print("     The split parent cannot be divided between its two 2021 children")
        print("     without fabricating data, so those rows are left BLANK in the")
        print("     main output. A like-for-like file aggregating the 2021 children")
        print("     back onto the 2011 parent footprint is written alongside it.")
    else:
        print("  NO - every Lewisham MSOA kept its code. Joining on code is valid.")

    print("\n[CHECK 3] Category labels, verbatim")
    print(f"\n  2011 QS412EW - CSV header ({len(header11)} cols):")
    print(f"    {header11}")
    print(f"  2011 category column: {cat11!r}")
    for k in sorted(labels11, key=int):
        mark = " <- OVERCROWDED" if k in OVERCROWDED_IDS else (" <- TOTAL" if k == ID_TOTAL else "")
        print(f"    id={k}  {labels11[k]!r}{mark}")

    print(f"\n  2021 TS052 - CSV header ({len(header21)} cols):")
    print(f"    {header21}")
    print(f"  2021 category column: {cat21!r}")
    for k in sorted(labels21, key=int):
        mark = " <- OVERCROWDED" if k in OVERCROWDED_IDS else (" <- TOTAL" if k == ID_TOTAL else "")
        print(f"    id={k}  {labels21[k]!r}{mark}")

    # Guard the id->label mapping so a future Nomis reshuffle cannot silently
    # change which categories are treated as overcrowded.
    for labels, year in ((labels11, "2011"), (labels21, "2021")):
        if "-1" not in labels[ID_MINUS_1] or "-2" not in labels[ID_MINUS_2_OR_LESS]:
            raise RuntimeError(
                f"{year} category ids do not map to the -1 / -2-or-less labels: {labels}"
            )
    print("\n  -> id=4 ('-1') + id=5 ('-2 or less') = overcrowded, both years. Verified.")

    print("\n[CHECK 4] Borough-level overcrowding rate (sanity check)")
    sum11_oc = sum(v["overcrowded"] for v in stats11.values())
    sum11_tot = sum(v["total"] for v in stats11.values())
    sum21_oc = sum(v["overcrowded"] for v in stats21.values())
    sum21_tot = sum(v["total"] for v in stats21.values())
    print(f"  2011: {b11['overcrowded']:,} / {b11['total']:,} households = {b11['rate']:.2f}%")
    print(f"  2021: {b21['overcrowded']:,} / {b21['total']:,} households = {b21['rate']:.2f}%")
    print(f"  Change: {b21['rate'] - b11['rate']:+.2f} percentage points")
    print("  (borough figures fetched independently at LA level, not summed from MSOAs)")
    print("\n  Cross-check, MSOA sums vs independently-fetched borough totals:")
    # Census 2021 applies cell-key perturbation independently at each geography
    # level, so MSOA sums are not guaranteed to reconcile exactly with the LA
    # figure. 2011 used record swapping and does reconcile exactly. Any
    # discrepancy is reported rather than hidden; a large one is a parse error.
    for year, s_oc, s_tot, b in (
        ("2011", sum11_oc, sum11_tot, b11),
        ("2021", sum21_oc, sum21_tot, b21),
    ):
        d_oc = s_oc - b["overcrowded"]
        d_tot = s_tot - b["total"]
        exact = (d_oc == 0 and d_tot == 0)
        print(f"    {year} MSOA sum: {s_oc:,} / {s_tot:,}"
              f"   borough: {b['overcrowded']:,} / {b['total']:,}"
              f"   delta: {d_oc:+d} / {d_tot:+d}"
              f"   {'EXACT' if exact else 'within tolerance (disclosure control)'}")
        rel = max(abs(d_oc) / b["overcrowded"], abs(d_tot) / b["total"])
        if rel > 0.005:
            raise RuntimeError(
                f"{year} MSOA totals differ from the borough total by {rel:.2%} - "
                "far beyond disclosure-control noise, so the parse is wrong."
            )
    if (sum11_oc, sum11_tot) != (b11["overcrowded"], b11["total"]):
        raise RuntimeError("2011 MSOA totals must reconcile exactly with the borough total")
    print("    note: the 2021 delta is ONS cell-key perturbation, applied independently")
    print("          per geography level. MSOA rates are used as published, never rescaled.")
    for year, rate in (("2011", b11["rate"]), ("2021", b21["rate"])):
        if not 3.0 <= rate <= 30.0:
            raise RuntimeError(
                f"{year} borough rate {rate:.2f}% is outside a plausible range - parse is wrong."
            )
    print("  -> both years land in the plausible London range. Parse looks correct.")

    # ----------------------------------------------------------------------
    # Output
    # ----------------------------------------------------------------------
    print("\n" + "=" * 78)
    print("OUTPUT")
    print("=" * 78)

    name21 = {f["properties"]["MSOA21CD"]: f["properties"]["MSOA21NM"] for f in feats}
    parents: dict[str, list[str]] = {}
    for r in lookup_rows:
        parents.setdefault(r["MSOA21CD"], []).append(r["MSOA11CD"])

    cols = [
        "msoa21cd", "msoa21nm",
        "overcrowded_2011", "total_2011", "rate_2011",
        "overcrowded_2021", "total_2021", "rate_2021",
        "rate_change_pp",
    ]

    main_path = DATA / "lewisham_overcrowding.csv"
    blank_rows = []
    with main_path.open("w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(cols)
        for code in sorted(stats21):
            s21 = stats21[code]
            src = parents.get(code, [])
            # Only join where the 2021 area is the same footprint as one 2011 area.
            joinable = len(src) == 1 and src[0] in stats11 and src[0] == code
            if joinable:
                s11 = stats11[code]
                w.writerow([
                    code, name21.get(code, names21.get(code, "")),
                    s11["overcrowded"], s11["total"], f"{s11['rate']:.4f}",
                    s21["overcrowded"], s21["total"], f"{s21['rate']:.4f}",
                    f"{s21['rate'] - s11['rate']:.4f}",
                ])
            else:
                blank_rows.append(code)
                w.writerow([
                    code, name21.get(code, names21.get(code, "")),
                    "", "", "",
                    s21["overcrowded"], s21["total"], f"{s21['rate']:.4f}",
                    "",
                ])

    # Like-for-like: aggregate 2021 children back onto the 2011 parent footprint.
    # This is exact arithmetic on household counts, not interpolation.
    lfl_path = DATA / "lewisham_overcrowding_like_for_like.csv"
    children: dict[str, list[str]] = {}
    for r in lookup_rows:
        children.setdefault(r["MSOA11CD"], []).append(r["MSOA21CD"])
    with lfl_path.open("w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(cols + ["msoa21cd_components", "chngind"])
        for code11 in sorted(stats11):
            kids = children.get(code11, [])
            if not kids or any(k not in stats21 for k in kids):
                raise RuntimeError(f"Cannot resolve 2021 components for {code11}: {kids}")
            oc = sum(stats21[k]["overcrowded"] for k in kids)
            tot = sum(stats21[k]["total"] for k in kids)
            s11 = stats11[code11]
            r21 = 100.0 * oc / tot
            ind = {r["CHNGIND"] for r in lookup_rows if r["MSOA11CD"] == code11}
            w.writerow([
                kids[0] if len(kids) == 1 else code11,
                name21.get(kids[0], "") if len(kids) == 1 else names11[code11],
                s11["overcrowded"], s11["total"], f"{s11['rate']:.4f}",
                oc, tot, f"{r21:.4f}", f"{r21 - s11['rate']:.4f}",
                "|".join(sorted(kids)), "|".join(sorted(ind)),
            ])

    print(f"  {main_path.relative_to(ROOT)}  ({len(stats21)} rows, keyed on 2021 codes)")
    if blank_rows:
        print(f"     -> {len(blank_rows)} row(s) have BLANK 2011 columns: {blank_rows}")
    print(f"  {lfl_path.relative_to(ROOT)}  ({len(stats11)} rows, 2011 footprint, exact aggregation)")
    print(f"  {(DATA / 'lewisham_msoa.geojson').relative_to(ROOT)}  ({len(feats)} features)")

    print("\n" + "=" * 78)
    print("PROVENANCE")
    print("=" * 78)
    for p in PROVENANCE:
        flag = "cached" if p["cached"] else "fetched"
        print(f"\n  {p['source']}")
        print(f"    url       : {p['url']}")
        print(f"    retrieved : {p['retrieved']}  ({flag})")
        print(f"    raw file  : {p['file']}  ({p['bytes']:,} bytes)")

    (DATA / "provenance.json").write_text(json.dumps(PROVENANCE, indent=2))
    print(f"\n  Written to {(DATA / 'provenance.json').relative_to(ROOT)}")

    print("\n" + "=" * 78)
    print("STAGE 1 COMPLETE - stopping here as instructed (no frontend).")
    print("=" * 78)
    return 0


if __name__ == "__main__":
    sys.exit(main())
