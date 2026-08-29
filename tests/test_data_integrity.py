import copy
import csv
import io
import json
import unittest
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

import build_access_to_space as access_builder


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


class AccessToSpaceDataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rents = list(csv.DictReader(io.StringIO(
            (DATA / "raw/lewisham_pipr_monthly_by_bedroom.csv").read_text()
        )))
        cls.earnings = {
            int(row["year"]): Decimal(row["median_annual_gross_earnings_gbp"])
            for row in csv.DictReader(io.StringIO(
                (DATA / "raw/lewisham_ashe_annual_earnings.csv").read_text()
            ))
        }
        cls.derived = json.loads((DATA / "access_to_space.json").read_text())
        cls.annual = {row["year"]: row for row in cls.derived["annual"]}
        cls.by_year = defaultdict(list)
        for row in cls.rents:
            cls.by_year[int(row["month"][:4])].append(row)

    def test_complete_published_period_and_partial_2026_exclusion(self):
        self.assertEqual(list(self.annual), list(range(2015, 2026)))
        for year in range(2015, 2026):
            months = {int(row["month"][-2:]) for row in self.by_year[year]}
            self.assertEqual(months, set(range(1, 13)), year)
            self.assertEqual(self.annual[year]["months"], 12)
            self.assertGreater(self.earnings[year], 0)
        self.assertEqual(len(self.by_year[2026]), 7)
        self.assertNotIn(2026, self.annual)

    def test_every_derived_value_reconciles_to_raw_inputs(self):
        steps = (
            ("1_to_2", "rent_1_bed_gbp", "rent_2_bed_gbp"),
            ("2_to_3", "rent_2_bed_gbp", "rent_3_bed_gbp"),
            ("3_to_4plus", "rent_3_bed_gbp", "rent_4plus_bed_gbp"),
        )
        for year, published in self.annual.items():
            for key, smaller, larger in steps:
                annual = sum(
                    Decimal(row[larger]) - Decimal(row[smaller])
                    for row in self.by_year[year]
                )
                percentage = annual / self.earnings[year] * Decimal("100")
                step = published["steps"][key]
                self.assertEqual(Decimal(str(step["annual_additional_rent_gbp"])), annual)
                self.assertAlmostEqual(
                    Decimal(str(step["percentage_of_earnings"])), percentage, places=6
                )

    def test_audit_headline_values(self):
        expected = {
            2015: {"1_to_2": (2981, 10.834878), "2_to_3": (1818, 6.607785), "3_to_4plus": (5846, 21.248137)},
            2024: {"1_to_2": (3723, 9.898700), "2_to_3": (2910, 7.737098), "3_to_4plus": (7714, 20.509957)},
            2025: {"1_to_2": (3914, 9.907607), "2_to_3": (3057, 7.738261), "3_to_4plus": (7894, 19.982281)},
        }
        for year, steps in expected.items():
            for key, (annual, percentage) in steps.items():
                actual = self.annual[year]["steps"][key]
                self.assertEqual(actual["annual_additional_rent_gbp"], annual)
                self.assertAlmostEqual(actual["percentage_of_earnings"], percentage, places=6)

    def test_source_provenance_is_identifiable(self):
        provenance = json.loads((DATA / "provenance.json").read_text())
        by_id = {entry["id"]: entry for entry in provenance if "id" in entry}
        for source_id in self.derived["_meta"]["sources"]:
            self.assertIn(source_id, by_id)
            source = by_id[source_id]
            self.assertTrue(source.get("source"))
            self.assertTrue(source.get("url") or source.get("verification_required"))

    def test_builder_rejects_incomplete_year_and_zero_earnings(self):
        rents = access_builder.read_rents(access_builder.DEFAULT_RENTS)
        earnings = access_builder.read_earnings(access_builder.DEFAULT_EARNINGS)
        incomplete = copy.deepcopy(rents)
        del incomplete[2015][12]
        with self.assertRaisesRegex(ValueError, "missing=\\[12\\]"):
            access_builder.build_annual(incomplete, earnings)
        invalid_earnings = dict(earnings)
        invalid_earnings[2015] = Decimal("0")
        with self.assertRaisesRegex(ValueError, "earnings are missing or zero"):
            access_builder.build_annual(rents, invalid_earnings)


class ExistingDataRegressionTests(unittest.TestCase):
    def test_strand_a_headline_and_geography_are_unchanged(self):
        rows = list(csv.DictReader(io.StringIO(
            (DATA / "lewisham_overcrowding_like_for_like.csv").read_text()
        )))
        self.assertEqual(len(rows), 36)
        self.assertEqual(sum(int(row["overcrowded_2011"]) for row in rows), 14018)
        self.assertEqual(sum(int(row["overcrowded_2021"]) for row in rows), 13964)
        self.assertEqual(sum(int(row["total_2011"]) for row in rows), 116091)
        self.assertEqual(sum(int(row["total_2021"]) for row in rows), 122390)

        boundaries = json.loads((DATA / "lewisham_msoa.geojson").read_text())
        polygon_codes = {feature["properties"]["MSOA21CD"] for feature in boundaries["features"]}
        component_codes = {
            code for row in rows for code in row["msoa21cd_components"].split("|") if code
        }
        self.assertEqual(len(boundaries["features"]), 37)
        self.assertEqual(component_codes, polygon_codes)

    def test_bedroom_mix_summary_reconciles_to_schemes(self):
        developments = json.loads((DATA / "developments.json").read_text())
        summary = developments["_summary"]
        schemes = [
            scheme
            for key, value in developments.items()
            if key not in {"_summary", "unassigned"} and isinstance(value, list)
            for scheme in value
        ]
        self.assertEqual(len(schemes), summary["schemes"])
        self.assertEqual(sum(scheme["homes"] for scheme in schemes), summary["homes_gained"])
        self.assertEqual(
            sum(scheme["affordable_homes"] for scheme in schemes), summary["affordable_homes"]
        )
        family_keys = ("3", "4", "5plus")
        self.assertEqual(
            sum(sum(scheme["bedrooms"].get(key, 0) for key in family_keys) for scheme in schemes),
            summary["three_plus_bed"],
        )
        self.assertEqual(
            sum(
                sum(scheme["bedrooms_affordable"].get(key, 0) for key in family_keys)
                for scheme in schemes
            ),
            summary["three_plus_bed_affordable"],
        )


class FrontendContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = (ROOT / "src/App.jsx").read_text()
        cls.access = (ROOT / "src/components/AccessToSpace.jsx").read_text()
        cls.overview = (ROOT / "src/components/ProjectOverview.jsx").read_text()
        cls.readme = (ROOT / "README.md").read_text()
        cls.styles = (ROOT / "src/styles.css").read_text()

    def test_central_research_question_is_unchanged_everywhere(self):
        question = (
            "Why can household overcrowding remain stalled despite substantial housing "
            "construction, and what prevents households that need more space from moving "
            "into suitably sized homes?"
        )
        self.assertIn(question, self.overview)
        self.assertIn(question, " ".join(self.readme.split()))

    def test_page_order_and_existing_map_contracts(self):
        markers = [
            "<Header", "<ProjectOverview", "<BedroomMix", "<AccessToSpace",
            "section--map", "<HouseholdsChart", "<TableView", "<CurrentCaseStudy",
            "<MethodSection", "<LimitationsBox", "<Footer",
        ]
        positions = [self.app.index(marker) for marker in markers]
        self.assertEqual(positions, sorted(positions))
        self.assertIn("new URLSearchParams(window.location.hash", self.app)
        self.assertIn("setSelectedCode", self.app)
        self.assertIn("#' + h", self.app)

    def test_access_chart_interaction_and_non_colour_contracts(self):
        for contract in (
            "aria-pressed", "tabIndex=\"0\"", "onFocus", "onBlur", "onMouseEnter",
            "<title", "<desc", "<ValuesTable", "strokeDasharray", "shape: 'circle'",
            "shape: 'square'", "shape: 'triangle'", "source?.url", "noopener noreferrer",
        ):
            self.assertIn(contract, self.access)
        self.assertNotIn("2026", self.access)
        for unsupported in ("trapped", "cannot afford", "priced out", "4-bedroom", "4 bedroom"):
            self.assertNotIn(unsupported, self.access.lower())
        self.assertIn("3→4+ bedrooms", self.access)

    def test_responsive_and_dark_mode_contracts(self):
        self.assertIn("@media (prefers-color-scheme: dark)", self.styles)
        self.assertIn("@media (max-width: 560px)", self.styles)
        self.assertIn(".access-chart { min-width: 560px; }", self.styles)
        self.assertIn("overflow-x: auto", self.styles)
        for variable in ("--access-12", "--access-23", "--access-34"):
            self.assertEqual(self.styles.count(variable), 2)


if __name__ == "__main__":
    unittest.main()
