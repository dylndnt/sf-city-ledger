"""Fetch and publish a validated DataSF snapshot."""

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from scripts.build_data import build_snapshot, write_if_changed

MIN_FY2025_ROWS = 20_000
MAX_DOWNLOAD_BYTES = 40_000_000


def get(url: str) -> bytes:
    headers = {"User-Agent": "sf-actuals-fund-view/1.0"}
    token = os.environ.get("SOCRATA_APP_TOKEN")
    if token:
        headers["X-App-Token"] = token
    with urlopen(Request(url, headers=headers), timeout=45) as response:
        raw = response.read(MAX_DOWNLOAD_BYTES + 1)
    if len(raw) > MAX_DOWNLOAD_BYTES:
        raise ValueError("source exceeds configured download limit")
    return raw


def refresh(fiscal_year: str, output: Path, archive: Path) -> bool:
    query = urlencode({"$where": f"fiscal_year='{fiscal_year}'", "$limit": "50000"})
    raw = get(f"https://data.sfgov.org/resource/bpnb-jwfb.csv?{query}")
    metadata = get("https://data.sfgov.org/api/views/bpnb-jwfb.json")
    fetched_at = datetime.now(timezone.utc)
    stamp = fetched_at.strftime("%Y%m%dT%H%M%SZ")
    archive.mkdir(parents=True, exist_ok=True)
    archive.joinpath(f"spending-revenue-fy{fiscal_year}-{stamp}.csv").write_bytes(raw)
    archive.joinpath(f"source-metadata-{stamp}.json").write_bytes(metadata)
    snapshot = build_snapshot(raw, fiscal_year, fetched_at.isoformat())
    if fiscal_year == "2025" and snapshot["sourceRows"] < MIN_FY2025_ROWS:
        raise ValueError(f"incomplete source: {snapshot['sourceRows']} FY2025 rows")
    return write_if_changed(snapshot, output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--fiscal-year", default="2025")
    parser.add_argument("--output", type=Path, default=Path("public/data/fy2025.json"))
    parser.add_argument("--archive", type=Path, default=Path("build/source"))
    args = parser.parse_args()
    try:
        changed = refresh(args.fiscal_year, args.output, args.archive)
        print("updated" if changed else "unchanged")
    except Exception as error:
        print(f"refresh failed: {error}", file=sys.stderr)
        raise SystemExit(1)
