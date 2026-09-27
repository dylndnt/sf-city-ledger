import csv
import io
import json
import tempfile
import unittest
from pathlib import Path

from scripts.build_data import build_snapshot, write_if_changed


FIELDS = [
    "fiscal_year", "related_govt_units", "revenue_or_spending", "character_code",
    "organization_group_code", "organization_group", "fund_type_code",
    "fund_type", "fund_code", "fund", "amount", "data_as_of",
]


def sample_csv(character_code="PROP_TAX", as_of="2026-09-20T23:05:20.000"):
    rows = [
        ["2025", "NO", "Revenue", character_code, "01", "Public Protection",
         "GEN_FUND", "General Fund", "GF~1", "General Fund", "100.00", as_of],
        ["2025", "NO", "Revenue", "ELS", "01", "Public Protection",
         "GEN_FUND", "General Fund", "GF~1", "General Fund", "-20.00", as_of],
        ["2025", "NO", "Spending", "SALARIES", "01", "Public Protection",
         "GEN_FUND", "General Fund", "GF~1", "General Fund", "50.00", as_of],
        ["2025", "YES", "Revenue", "PROP_TAX", "01", "Public Protection",
         "GEN_FUND", "General Fund", "GF~1", "General Fund", "70.00", as_of],
    ]
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(FIELDS)
    writer.writerows(rows)
    return out.getvalue().encode()


class BuildDataTests(unittest.TestCase):
    def test_signed_totals_and_related_unit_filter(self):
        data = build_snapshot(sample_csv(), "2025", "2026-09-27T00:00:00Z")
        self.assertEqual(data["fiscalYear"], "2025")
        self.assertEqual(data["dataAsOf"], "2026-09-20T23:05:20.000")
        self.assertEqual(data["sourceRows"], 4)
        self.assertEqual(len(data["funds"]), 1)
        fund = data["funds"][0]
        self.assertEqual(fund["revenueGroups"]["Taxes"], 10_000)
        self.assertEqual(fund["revenueGroups"]["Financing, transfers and recoveries"], -2_000)
        self.assertEqual(fund["spendingGroups"]["01"], 5_000)

    def test_unknown_revenue_code_stops_publication(self):
        with self.assertRaisesRegex(ValueError, "unknown revenue character"):
            build_snapshot(sample_csv("UNEXPECTED"), "2025", "2026-09-27T00:00:00Z")

    def test_missing_columns_and_mixed_dates_stop_publication(self):
        with self.assertRaisesRegex(ValueError, "missing columns"):
            build_snapshot(b"fiscal_year,amount\n2025,1\n", "2025", "2026-09-27T00:00:00Z")
        mixed = sample_csv().replace(b"-20.00,2026-09-20", b"-20.00,2026-09-19")
        with self.assertRaisesRegex(ValueError, "mixed data_as_of"):
            build_snapshot(mixed, "2025", "2026-09-27T00:00:00Z")

    def test_same_source_hash_keeps_existing_snapshot(self):
        data = build_snapshot(sample_csv(), "2025", "2026-09-27T00:00:00Z")
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "fy2025.json"
            self.assertTrue(write_if_changed(data, path))
            before = path.read_bytes()
            data["processedAt"] = "2026-09-28T00:00:00Z"
            self.assertFalse(write_if_changed(data, path))
            self.assertEqual(path.read_bytes(), before)
            self.assertEqual(json.loads(before)["sourceSha256"], data["sourceSha256"])

    def test_changed_transformation_updates_existing_snapshot(self):
        data = build_snapshot(sample_csv(), "2025", "2026-09-27T00:00:00Z")
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "fy2025.json"
            self.assertTrue(write_if_changed(data, path))
            data["sourceRows"] = 5
            self.assertTrue(write_if_changed(data, path))
            self.assertEqual(json.loads(path.read_text(encoding="utf-8"))["sourceRows"], 5)


if __name__ == "__main__":
    unittest.main()
