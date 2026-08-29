#!/usr/bin/env python3
"""
Fetch completed Lewisham housing schemes from the GLA Planning London Datahub.

The datahub absorbed the London Development Database and is the authoritative
record of London completions. Guest API, read-only, no auth required.

Scope: schemes of 20+ homes with a completion date in 2011-2021.

Field quirks that cost a failed query each, recorded so the next person does not
repeat them:
  * `borough` is a TEXT field - filter with `match`, not `term` (term returns 0)
  * `actual_completion_date` is a DATE field with format dd/MM/yyyy - range
    queries must use that format, not ISO
  * `url_planning_app` is null on every Lewisham record

Caches the raw response gzipped to data/raw/ (6.8 MB -> 0.1 MB) so reruns do not
re-hit the API. A failed fetch raises. Nothing is fabricated.
"""
import gzip, json, pathlib, time, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "data/raw/pld_lewisham_completions_2011_2021.json.gz"
API = "https://planningdata.london.gov.uk/api-guest/applications/_search"
MIN_UNITS = 20
FROM, TO = "01/01/2011", "31/12/2021"

FIELDS = ["id", "lpa_app_no", "borough", "site_name", "site_number", "street_name",
          "secondary_street_name", "postcode", "ward", "locality", "centroid",
          "actual_completion_date", "actual_commencement_date", "description",
          "development_type", "application_type", "status", "url_planning_app",
          "application_details.residential_details"]

UNITS = "application_details.residential_details.total_no_proposed_residential_units"


def page(frm, size):
    body = {"size": size, "from": frm, "sort": [{UNITS: "desc"}], "_source": FIELDS,
            "query": {"bool": {"filter": [
                {"match": {"borough": "Lewisham"}},
                {"range": {"actual_completion_date": {"gte": FROM, "lte": TO}}},
                {"range": {UNITS: {"gte": MIN_UNITS}}}]}}}
    req = urllib.request.Request(API, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as f:
        return json.load(f)


def main():
    print(f"Planning London Datahub: Lewisham, {MIN_UNITS}+ homes, completed {FROM}-{TO}")
    hits, frm = [], 0
    while True:
        d = page(frm, 10)
        if "error" in d:
            raise RuntimeError("API error: " + json.dumps(d["error"])[:500])
        total = d["hits"]["total"]["value"]
        batch = d["hits"]["hits"]
        if not batch and not hits:
            raise RuntimeError("API returned zero schemes - the query is wrong.")
        hits += batch
        print(f"  fetched {len(hits)}/{total}", flush=True)
        frm += len(batch)
        if not batch or len(hits) >= total:
            break
        time.sleep(0.4)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {"retrieved": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
               "api": API,
               "query": f"borough=Lewisham, actual_completion_date {FROM}-{TO}, "
                        f"{UNITS}>={MIN_UNITS}",
               "count": len(hits), "hits": hits}
    with gzip.open(OUT, "wt", encoding="utf-8") as f:
        json.dump(payload, f)
    print(f"  saved {OUT.relative_to(ROOT)} ({OUT.stat().st_size/1024:.0f} KB gzipped)")
    print(f"  schemes: {len(hits)}")
    print("\n  Per-scheme records stay retrievable at:")
    print("    https://planningdata.london.gov.uk/api-guest/applications/_doc/<id>")


if __name__ == "__main__":
    main()
