import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.refresh_data import refresh


class RefreshTests(unittest.TestCase):
    def test_invalid_download_leaves_last_valid_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "fy2025.json"
            path.write_text('{"sourceSha256":"old"}', encoding="utf-8")
            before = path.read_bytes()
            with patch("scripts.refresh_data.get", side_effect=[b"fiscal_year,amount\n2025,1\n", b"{}"]):
                with self.assertRaisesRegex(ValueError, "missing columns"):
                    refresh("2025", path, Path(directory) / "archive")
            self.assertEqual(path.read_bytes(), before)

    def test_short_download_leaves_last_valid_file(self):
        raw = (
            b"fiscal_year,related_govt_units,revenue_or_spending,character_code,"
            b"organization_group_code,organization_group,fund_type_code,fund_type,"
            b"fund_code,fund,amount,data_as_of\n"
            b"2025,NO,Revenue,PROP_TAX,01,Public Protection,GEN_FUND,"
            b"General Fund,GF~1,General Fund,100.00,2026-09-20T23:05:20.000\n"
        )
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "fy2025.json"
            path.write_text('{"sourceSha256":"old"}', encoding="utf-8")
            before = path.read_bytes()
            with patch("scripts.refresh_data.get", side_effect=[raw, b"{}"]):
                with self.assertRaisesRegex(ValueError, "incomplete source"):
                    refresh("2025", path, Path(directory) / "archive")
            self.assertEqual(path.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
