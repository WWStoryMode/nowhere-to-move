#!/usr/bin/env python3
"""
Build data/developments.json from the cached Planning London Datahub pull.

Source: GLA Planning London Datahub (which absorbed the London Development
Database), read-only guest API. Every scheme carries a per-document URL that
resolves, so each figure can be checked at source.

Nothing here is inferred from census household growth. Schemes are located by
point-in-polygon of the datahub's own centroid against the MSOA boundaries this
project already uses, then folded onto the like-for-like key - never guessed.

Run fetch_data.py and fetch_developments.py first; this reads only the cache.
"""
import gzip, json, csv, collections, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent
RAW = ROOT / "data/raw/pld_lewisham_completions_2011_2021.json.gz"
OUT = ROOT / "data/developments.json"
DOC = "https://planningdata.london.gov.uk/api-guest/applications/_doc/{}"

# Only tenure labels actually present in the Lewisham data. Anything not
# "Market for sale" is affordable; asserted below so a new label cannot slip
# through and be silently counted as market housing.
MARKET = "Market for sale"
KNOWN_TENURES = {MARKET, "Social Rent", "Intermediate Other",
                 "Affordable Rent (not at LAR benchmark rents)"}

# Corroboration: pages retrieved in this session that independently discuss the
# scheme. Only these five are corroborated; everything else rests on the
# datahub alone and is marked medium.
CORROBORATED = {
    "DC09/71246": dict(
        name="Renaissance, Loampit Vale",
        url="https://en.wikipedia.org/wiki/Renaissance,_Lewisham",
        confidence="high",
        note="Wikipedia records 788 flats in 10 buildings with 'up to 186 affordable'; "
             "the datahub records 794 units of which 186 are affordable. Independent "
             "sources agree on the affordable count. Barratt Homes; Assael Architecture. "
             "Built with the Glass Mill leisure centre."),
    "DC07/67276": dict(
        name="Catford Green (former Catford Greyhound Stadium)",
        url="https://hdawards.org/scheme/catford-green/",
        confidence="low",
        note="AFFORDABLE FIGURE DISPUTED - please verify. This datahub record covers 414 "
             "of the scheme's ~589 units and reports 71.3% affordable; a second record "
             "(DC15/093128, 179 units) reports 7.8%. Combined that is 593 units at 52.1%. "
             "The Housing Design Awards page states '71% Market sale, 29% Affordable' for "
             "Catford Green as a whole, which contradicts the datahub. Barratt London; "
             "Witherford Watson Mann; completion 01/2018."),
    "DC15/093128": dict(
        name="Catford Green, later phase (former Catford Greyhound Stadium)",
        url="https://hdawards.org/scheme/catford-green/",
        confidence="low",
        note="Second datahub record for Catford Green - see DC07/67276. Its own "
             "description lists '4x studio apartments' yet records no zero-bedroom "
             "units, which is the clearest evidence that studios are counted as 1-bed."),
    "DC12/081169": dict(
        name="Heathside and Lethbridge Estates, phase 3",
        url="https://lewisham.gov.uk/inmyarea/regeneration/lewishamtowncentre/heathside-and-lethbridge",
        confidence="medium",
        note="Estate regeneration with Family Mosaic (now Peabody). Published accounts of "
             "phase 3 give 218 homes including 102 for social rent, matching the datahub's "
             "218 units at 48.6% affordable. The linked council page confirms the scheme "
             "and partner but its totals are stale and not phase-specific."),
    "DC14/087333": dict(
        name="Heathside and Lethbridge Estates, phase 4",
        url="https://lewisham.gov.uk/inmyarea/regeneration/lewishamtowncentre/heathside-and-lethbridge",
        confidence="medium",
        note="Estate regeneration with Family Mosaic (now Peabody). The linked council page "
             "confirms the scheme and partner but its totals are stale and not "
             "phase-specific, so the phase-4 figures rest on the datahub."),
}

def clean_name(site, street):
    """PLD site_name values are frequently doubled; collapse and tidy for display."""
    s = " ".join((site or "").split())
    for n in range(len(s) // 2, 3, -1):          # collapse "X X" -> "X"
        if s[:n].strip() and s[:n].strip() == s[n:2 * n].strip():
            s = s[:n].strip(); break
    st = " ".join((street or "").split())
    if st and st.lower() not in s.lower():
        s = f"{s} {st}".strip()
    s = re.sub(r"\s+", " ", s).strip(" ,")
    if s and s == s.upper():                      # ALL CAPS -> Title Case
        s = " ".join(w if len(w) <= 2 and w.isalpha() and w.lower() in
                     {"of", "on", "at", "in", "to"} else w.capitalize()
                     for w in s.lower().split())
        s = re.sub(r"\bP\.h\.\b", "P.H.", s, flags=re.I)
    return s

def rings(g): return [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]

def pip(lon, lat, g):
    for poly in rings(g):
        o = poly[0]; hit = False
        for i in range(len(o)):
            x1, y1 = o[i][:2]; x2, y2 = o[i - 1][:2]
            if ((y1 > lat) != (y2 > lat)) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
                hit = not hit
        if hit:
            for h in poly[1:]:                    # subtract holes
                hh = False
                for i in range(len(h)):
                    x1, y1 = h[i][:2]; x2, y2 = h[i - 1][:2]
                    if ((y1 > lat) != (y2 > lat)) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
                        hh = not hh
                if hh: hit = False; break
        if hit: return True
    return False

def bedkey(b):
    if b is None: return "unknown"
    b = int(float(b))                             # PLD mixes 1 and 1.0
    return "5plus" if b >= 5 else str(b)

def main():
    with gzip.open(RAW, "rt", encoding="utf-8") as f:
        raw = json.load(f)
    gj = json.loads((ROOT / "data/lewisham_msoa.geojson").read_text())
    lfl = list(csv.DictReader((ROOT / "data/lewisham_overcrowding_like_for_like.csv").open()))
    key = {c: r["msoa21cd"] for r in lfl for c in r["msoa21cd_components"].split("|")}
    valid = {r["msoa21cd"] for r in lfl}

    out = collections.defaultdict(list)
    out["unassigned"] = []
    tot_b, tot_a = collections.Counter(), collections.Counter()
    seen_tenures = set()

    for h in sorted(raw["hits"],
                    key=lambda x: -(x["_source"]["application_details"]["residential_details"]
                                    .get("total_no_proposed_residential_units") or 0)):
        s = h["_source"]
        rd = s["application_details"]["residential_details"]
        ref = s.get("lpa_app_no")

        beds, beds_aff = collections.Counter(), collections.Counter()
        homes = affordable = losses = 0
        for u in rd.get("residential_units") or []:
            t = u.get("tenure"); seen_tenures.add(t)
            if u.get("change_type") == "Loss":
                losses += 1; continue
            if u.get("change_type") != "Gain":
                continue
            homes += 1
            k = bedkey(u.get("no_bedrooms")); beds[k] += 1
            if t != MARKET:
                affordable += 1; beds_aff[k] += 1

        c = s.get("centroid") or {}
        msoa = None
        try:
            lon, lat = float(c["lon"]), float(c["lat"])
            for f in gj["features"]:
                if pip(lon, lat, f["geometry"]):
                    msoa = key.get(f["properties"]["MSOA21CD"]); break
        except (KeyError, TypeError, ValueError):
            lon = lat = None

        cor = CORROBORATED.get(ref, {})
        notes = [n for n in [cor.get("note")] if n]
        if losses:
            notes.append(f"{losses} existing home(s) recorded as lost on this site; the "
                         "datahub records no bedroom count for losses, so figures here are "
                         "homes gained, not net.")
        notes.append(f"Planning ref {ref}. Figures counted from the datahub's unit-level "
                     f"records. Datahub record: {DOC.format(s['id'])}")

        entry = {
            "name": cor.get("name") or clean_name(s.get("site_name"), s.get("street_name")),
            "completed": s.get("actual_completion_date") or "",
            "homes": homes,
            "affordable_homes": affordable,
            "affordable_pct": round(100 * affordable / homes, 1) if homes else None,
            "bedrooms": {k: beds.get(k, 0) for k in ["1", "2", "3", "4", "5plus", "unknown"]},
            "bedrooms_affordable": {k: beds_aff.get(k, 0) for k in ["1", "2", "3", "4", "5plus", "unknown"]},
            "source_url": cor.get("url") or DOC.format(s["id"]),
            "confidence": cor.get("confidence", "medium"),
            "note": " ".join(notes),
        }
        if not msoa:
            entry["address"] = f"{clean_name(s.get('site_name'), s.get('street_name'))}, {s.get('postcode') or ''}".strip(", ")
            entry["needs_manual_check"] = True
            out["unassigned"].append(entry)
        else:
            out[msoa].append(entry)
            for k, v in beds.items(): tot_b[k] += v
            for k, v in beds_aff.items(): tot_a[k] += v

    unknown = seen_tenures - KNOWN_TENURES
    if unknown:
        raise SystemExit(f"Unrecognised tenure label(s), refusing to guess: {unknown}")
    # Every MSOA gets a key. An empty array is a finding - no scheme of 20+ homes
    # completed there in the period - not an omission.
    for m in valid:
        out.setdefault(m, [])

    bad = [k for k in out if k not in valid and k != "unassigned"]
    if bad:
        raise SystemExit(f"Keys not in the like-for-like table: {bad}")

    n = sum(tot_b.values())
    out["_summary"] = {
        "scope": "Lewisham schemes of 20+ homes with a completion date between 01/01/2011 "
                 "and 31/12/2021, from the GLA Planning London Datahub.",
        "source": "https://planningdata.london.gov.uk/api-guest/applications/_search",
        "retrieved": raw.get("retrieved"),
        "schemes": sum(len(v) for k, v in out.items() if isinstance(v, list)),
        "homes_gained": n,
        "affordable_homes": sum(tot_a.values()),
        "affordable_pct": round(100 * sum(tot_a.values()) / n, 1),
        "bedrooms": {k: tot_b.get(k, 0) for k in ["1", "2", "3", "4", "5plus", "unknown"]},
        "bedrooms_affordable": {k: tot_a.get(k, 0) for k in ["1", "2", "3", "4", "5plus", "unknown"]},
        "one_or_two_bed": tot_b["1"] + tot_b["2"],
        "one_or_two_bed_pct": round(100 * (tot_b["1"] + tot_b["2"]) / n, 1),
        "three_plus_bed": tot_b["3"] + tot_b["4"] + tot_b["5plus"],
        "three_plus_bed_pct": round(100 * (tot_b["3"] + tot_b["4"] + tot_b["5plus"]) / n, 1),
        "three_plus_bed_affordable": tot_a["3"] + tot_a["4"] + tot_a["5plus"],
        "caveats": [
            "STUDIOS CANNOT BE SEPARATED FROM 1-BEDS. No unit in the Lewisham data carries "
            "a zero bedroom count (0 of 9,947 rows), yet at least one scheme description "
            "lists studio apartments. The '1' category means one-bed-or-studio.",
            "Figures are homes GAINED. Demolitions are recorded inconsistently and carry no "
            "bedroom count, so these are not net figures.",
            "The datahub is self-reported by boroughs and applicants and is explicitly not "
            "quality-checked on receipt by the GLA.",
            "affordable_pct is per planning record, not per scheme. Phased developments "
            "appear as several records with very different shares - see Catford Green.",
            "Homes counted here must not be reconciled against census household change: "
            "they are gross gains on completed applications, on a different basis.",
        ],
    }

    OUT.write_text(json.dumps(
        {k: out[k] for k in (["_summary"] + sorted(k for k in out if k not in ("_summary", "unassigned")) + ["unassigned"])},
        indent=2, ensure_ascii=False))
    print(f"wrote {OUT.relative_to(ROOT)}")
    empty = [k for k, v in out.items() if isinstance(v, list) and not v and k != "unassigned"]
    print(f"  MSOAs with schemes : {sum(1 for k,v in out.items() if isinstance(v,list) and v and k!='unassigned')}")
    print(f"  MSOAs with none    : {len(empty)}  {sorted(empty)}")
    print(f"  schemes            : {out['_summary']['schemes']}")
    print(f"  unassigned         : {len(out['unassigned'])}")
    print(f"  homes gained       : {n:,}  ({out['_summary']['affordable_pct']}% affordable)")
    print(f"  1-2 bed            : {out['_summary']['one_or_two_bed']:,} ({out['_summary']['one_or_two_bed_pct']}%)")
    print(f"  3+ bed             : {out['_summary']['three_plus_bed']:,} ({out['_summary']['three_plus_bed_pct']}%)")

if __name__ == "__main__":
    main()
