#!/usr/bin/env python3
"""Build the annual access-to-space series from raw PIPR rents and ASHE earnings.

The source workbook contained spreadsheet-derived rent steps and percentages.
Those columns are deliberately absent from the cached source extracts and are
never read here. Every published value is recalculated from the four raw bedroom
rent columns and the raw annual earnings column.
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEFAULT_RENTS = ROOT / "data/raw/lewisham_pipr_monthly_by_bedroom.csv"
DEFAULT_EARNINGS = ROOT / "data/raw/lewisham_ashe_annual_earnings.csv"
DEFAULT_OUT = ROOT / "data/access_to_space.json"
PROVENANCE_PATH = ROOT / "data/provenance.json"

FIRST_YEAR = 2015
LAST_YEAR = 2025
EXPECTED_MONTHS = set(range(1, 13))
AREA_CODE = "E09000023"

RENT_FIELDS = {
    "month",
    "area_code",
    "area_name",
    "rent_1_bed_gbp",
    "rent_2_bed_gbp",
    "rent_3_bed_gbp",
    "rent_4plus_bed_gbp",
}
EARNINGS_FIELDS = {
    "year",
    "area_code",
    "area_name",
    "median_annual_gross_earnings_gbp",
}
STEPS = (
    ("1_to_2", "1→2 bedrooms", "rent_1_bed_gbp", "rent_2_bed_gbp"),
    ("2_to_3", "2→3 bedrooms", "rent_2_bed_gbp", "rent_3_bed_gbp"),
    ("3_to_4plus", "3→4+ bedrooms", "rent_3_bed_gbp", "rent_4plus_bed_gbp"),
)
SOURCE_PROVENANCE = [
    {
        "id": "ons_pipr",
        "source": "ONS Price Index of Private Rents (PIPR), Lewisham average monthly rents by bedroom count",
        "url": None,
        "verification_required": True,
        "note": (
            "Source URL was not included in the supplied CSV or existing repository "
            "documentation; verify and add the exact ONS source URL before publication."
        ),
        "file": "data/raw/lewisham_pipr_monthly_by_bedroom.csv",
        "coverage": "2015-01 to 2026-07; only complete calendar years 2015-2025 are published",
        "market": "Private rental market; not planning-defined affordable housing",
        "measure": "Average monthly rent by bedroom count; 4+ bedrooms is a combined ONS category",
        "derived_method": (
            "For each month, larger-bedroom rent minus smaller-bedroom rent. For each "
            "complete calendar year, mean monthly step multiplied by 12. Annual step divided "
            "by ASHE median gross annual earnings, multiplied by 100."
        ),
        "caveats": [
            "Average private rents are not rents specifically paid by overcrowded households.",
            "Aggregate rent data cannot establish household behaviour.",
            "The analysis does not demonstrate that rent levels caused observed overcrowding.",
        ],
    },
    {
        "id": "ashe_resident_earnings",
        "source": "ASHE resident-based median gross annual earnings for full-time workers, Lewisham",
        "url": None,
        "verification_required": True,
        "note": (
            "Source URL was not included in the supplied CSV or existing repository "
            "documentation; verify and add the exact ASHE source URL before publication."
        ),
        "file": "data/raw/lewisham_ashe_annual_earnings.csv",
        "coverage": "2015-2025",
        "measure": "Resident-based median gross annual earnings for full-time workers",
        "benchmark": "One full-time resident; not household or disposable income",
        "caveats": [
            "The earnings measure is not specific to private renters or overcrowded households.",
            "Aggregate earnings data cannot establish household behaviour.",
        ],
    },
]


def require_fields(path: Path, actual: list[str] | None, required: set[str]) -> None:
    missing = sorted(required - set(actual or []))
    if missing:
        raise ValueError(f"{path}: missing required raw field(s): {', '.join(missing)}")


def decimal_value(value: str, field: str, context: str) -> Decimal:
    try:
        parsed = Decimal(value.replace(",", "").strip())
    except (InvalidOperation, AttributeError):
        raise ValueError(f"{context}: {field} is not numeric: {value!r}") from None
    if not parsed.is_finite():
        raise ValueError(f"{context}: {field} is not finite")
    return parsed


def read_rents(path: Path) -> dict[int, dict[int, dict[str, Decimal]]]:
    by_year: dict[int, dict[int, dict[str, Decimal]]] = defaultdict(dict)
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        require_fields(path, reader.fieldnames, RENT_FIELDS)
        for line, row in enumerate(reader, 2):
            context = f"{path}:{line}"
            try:
                month = date.fromisoformat(f"{row['month']}-01")
            except (TypeError, ValueError):
                raise ValueError(f"{context}: invalid month {row.get('month')!r}; expected YYYY-MM") from None
            if row["area_code"] != AREA_CODE:
                raise ValueError(f"{context}: expected area_code {AREA_CODE}, got {row['area_code']!r}")
            if month.month in by_year[month.year]:
                raise ValueError(f"{context}: duplicate observation for {month:%Y-%m}")
            values = {
                field: decimal_value(row[field], field, context)
                for field in RENT_FIELDS if field.startswith("rent_")
            }
            if any(value <= 0 for value in values.values()):
                raise ValueError(f"{context}: bedroom rents must all be greater than zero")
            by_year[month.year][month.month] = values
    return dict(by_year)


def read_earnings(path: Path) -> dict[int, Decimal]:
    earnings: dict[int, Decimal] = {}
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        require_fields(path, reader.fieldnames, EARNINGS_FIELDS)
        for line, row in enumerate(reader, 2):
            context = f"{path}:{line}"
            try:
                year = int(row["year"])
            except (TypeError, ValueError):
                raise ValueError(f"{context}: invalid year {row.get('year')!r}") from None
            if row["area_code"] != AREA_CODE:
                raise ValueError(f"{context}: expected area_code {AREA_CODE}, got {row['area_code']!r}")
            if year in earnings:
                raise ValueError(f"{context}: duplicate earnings observation for {year}")
            value = decimal_value(
                row["median_annual_gross_earnings_gbp"],
                "median_annual_gross_earnings_gbp",
                context,
            )
            if value <= 0:
                raise ValueError(f"{context}: earnings must be greater than zero")
            earnings[year] = value
    return earnings


def rounded(value: Decimal, places: str) -> float:
    return float(value.quantize(Decimal(places), rounding=ROUND_HALF_UP))


def build_annual(
    rents: dict[int, dict[int, dict[str, Decimal]]],
    earnings: dict[int, Decimal],
) -> dict:
    annual = []
    for year in range(FIRST_YEAR, LAST_YEAR + 1):
        months = rents.get(year, {})
        present = set(months)
        if present != EXPECTED_MONTHS:
            missing = sorted(EXPECTED_MONTHS - present)
            extra = sorted(present - EXPECTED_MONTHS)
            raise ValueError(
                f"{year}: published annual rent series must contain months 1-12; "
                f"missing={missing}, extra={extra}"
            )
        annual_earnings = earnings.get(year)
        if annual_earnings is None or annual_earnings <= 0:
            raise ValueError(f"{year}: earnings are missing or zero for a published year")

        steps = {}
        for key, label, smaller, larger in STEPS:
            differences = [months[month][larger] - months[month][smaller] for month in range(1, 13)]
            mean_monthly = sum(differences, Decimal("0")) / Decimal("12")
            annual_cost = mean_monthly * Decimal("12")
            percentage = annual_cost / annual_earnings * Decimal("100")
            steps[key] = {
                "label": label,
                "mean_monthly_additional_rent_gbp": rounded(mean_monthly, "0.000001"),
                "annual_additional_rent_gbp": rounded(annual_cost, "0.01"),
                "percentage_of_earnings": rounded(percentage, "0.000001"),
            }

        annual.append(
            {
                "year": year,
                "months": 12,
                "median_annual_gross_earnings_gbp": rounded(annual_earnings, "0.01"),
                "steps": steps,
            }
        )

    result = {
        "_meta": {
            "area_code": AREA_CODE,
            "area_name": "Lewisham",
            "published_years": {"from": FIRST_YEAR, "to": LAST_YEAR},
            "method": (
                "For each calendar year and bedroom transition, subtract the smaller-home "
                "monthly rent from the larger-home monthly rent, take the mean of all 12 "
                "monthly differences, multiply by 12, then divide by resident-based median "
                "annual gross earnings for full-time workers and multiply by 100."
            ),
            "partial_years_excluded": [2026],
            "sources": ["ons_pipr", "ashe_resident_earnings"],
        },
        "annual": annual,
    }
    validate_derived(result, rents, earnings)
    return result


def validate_derived(
    result: dict,
    rents: dict[int, dict[int, dict[str, Decimal]]],
    earnings: dict[int, Decimal],
) -> None:
    expected_years = list(range(FIRST_YEAR, LAST_YEAR + 1))
    rows = result.get("annual")
    if not isinstance(rows, list) or [row.get("year") for row in rows] != expected_years:
        raise ValueError(f"derived annual data must contain exactly {expected_years}")

    for row in rows:
        year = row["year"]
        if row.get("months") != 12 or set(rents[year]) != EXPECTED_MONTHS:
            raise ValueError(f"{year}: published annual rent series does not contain expected months")
        annual_earnings = Decimal(str(row.get("median_annual_gross_earnings_gbp")))
        if annual_earnings <= 0 or annual_earnings != earnings[year]:
            raise ValueError(f"{year}: published earnings are missing, zero or inconsistent")

        for key, label, smaller, larger in STEPS:
            step = row.get("steps", {}).get(key, {})
            if step.get("label") != label:
                raise ValueError(f"{year} {key}: required label is {label!r}")
            raw_differences = [rents[year][month][larger] - rents[year][month][smaller] for month in range(1, 13)]
            expected_annual = sum(raw_differences, Decimal("0"))
            published_annual = Decimal(str(step.get("annual_additional_rent_gbp")))
            published_mean = Decimal(str(step.get("mean_monthly_additional_rent_gbp")))
            if abs(published_annual - expected_annual) > Decimal("0.005"):
                raise ValueError(f"{year} {label}: annual rent-step arithmetic is inconsistent")
            if abs(published_mean * Decimal("12") - published_annual) > Decimal("0.01"):
                raise ValueError(f"{year} {label}: monthly mean does not match annual rent step")
            expected_pct = published_annual / annual_earnings * Decimal("100")
            published_pct = Decimal(str(step.get("percentage_of_earnings")))
            if abs(published_pct - expected_pct) > Decimal("0.000001"):
                raise ValueError(f"{year} {label}: percentage does not match annual cost / earnings")


def print_verification(result: dict) -> None:
    selected = {row["year"]: row for row in result["annual"]}
    print("\nVERIFICATION (£ annual additional rent; % of annual earnings)")
    print("year | 1→2 annual £ | 1→2 % | 2→3 annual £ | 2→3 % | 3→4+ annual £ | 3→4+ %")
    print("-----|--------------|-------|--------------|-------|----------------|--------")
    for year in (2015, 2024, 2025):
        row = selected[year]
        values = []
        for key, *_ in STEPS:
            step = row["steps"][key]
            values.extend((f"{step['annual_additional_rent_gbp']:,.0f}", f"{step['percentage_of_earnings']:.1f}%"))
        print(f"{year} | " + " | ".join(values))


def update_provenance() -> None:
    existing = json.loads(PROVENANCE_PATH.read_text()) if PROVENANCE_PATH.exists() else []
    if not isinstance(existing, list):
        raise ValueError(f"{PROVENANCE_PATH}: provenance root must be an array")
    source_ids = {source["id"] for source in SOURCE_PROVENANCE}
    retained = [entry for entry in existing if entry.get("id") not in source_ids]
    PROVENANCE_PATH.write_text(json.dumps(retained + SOURCE_PROVENANCE, indent=2) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rents", type=Path, default=DEFAULT_RENTS)
    parser.add_argument("--earnings", type=Path, default=DEFAULT_EARNINGS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    rents = read_rents(args.rents)
    earnings = read_earnings(args.earnings)
    result = build_annual(rents, earnings)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    update_provenance()
    print(f"wrote {args.output.relative_to(ROOT) if args.output.is_relative_to(ROOT) else args.output}")
    print(f"updated {PROVENANCE_PATH.relative_to(ROOT)}")
    print_verification(result)


if __name__ == "__main__":
    main()
