"""Validate DataSF actuals and build the static fund-level snapshot."""

import argparse
import csv
import hashlib
import io
import json
import os
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

SOURCE_URL = "https://data.sf.gov/d/bpnb-jwfb"
ROW_LIMIT = 50_000
REQUIRED = {
    "fiscal_year", "related_govt_units", "revenue_or_spending", "character_code",
    "organization_group_code", "organization_group", "fund_type_code", "fund_type",
    "fund_code", "fund", "amount", "data_as_of",
}
REVENUE_CODES = {
    "PROP_TAX": "Taxes", "BUS_TAX": "Taxes", "OTHER_LOC_TAX": "Taxes",
    "CHGS_FOR_SERVICES": "Charges for services",
    "INTER_REV_FED": "Intergovernmental revenue",
    "INTERGOV_REV_ST": "Intergovernmental revenue",
    "INTERGOV_REV_OTH": "Intergovernmental revenue",
    "RENTS_CONCESSIONS": "Other operating revenue",
    "INT_INV_INC": "Other operating revenue",
    "FINE_FORF_PENAL": "Other operating revenue",
    "LIC_PERM_FRAN": "Other operating revenue",
    "OTH_REV": "Other operating revenue",
    **{code: "Financing, transfers and recoveries" for code in (
        "OTH_FIN_SRCS", "INTRAFD_TFR_IN", "OPER_TFR_IN", "TFR_IN_CAP_EXP",
        "EXP_RECOVERY", "CONVRSN_REV_ACCTS", "ELS",
    )},
}
FUND_GROUPS = {
    "GEN_FUND": "General Fund", "ENT_FUND": "Enterprise Funds",
    "SP_REV": "Special Revenue Funds", "DEBT_SRVC": "Other funds",
    "CPTL_PRJ": "Other funds", "INTRL_SRVC": "Other funds",
    "PERMA_FUND": "Other funds",
}


def cents(value: str) -> int:
    try:
        amount = Decimal(value) * 100
    except InvalidOperation as error:
        raise ValueError(f"invalid amount: {value}") from error
    if not amount.is_finite() or amount != amount.to_integral_value():
        raise ValueError(f"invalid cents: {value}")
    return int(amount)


def build_snapshot(raw: bytes, fiscal_year: str, processed_at: str) -> dict:
    reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
    if not reader.fieldnames or REQUIRED - set(reader.fieldnames):
        raise ValueError(f"missing columns: {sorted(REQUIRED - set(reader.fieldnames or []))}")
    funds = {}
    org_labels = {}
    timestamps = set()
    count = 0
    raw_totals = {"Revenue": 0, "Spending": 0}
    for row in reader:
        count += 1
        if count >= ROW_LIMIT:
            raise ValueError("source reached configured row limit")
        if row["fiscal_year"] != fiscal_year:
            raise ValueError("unexpected fiscal year")
        flag = row["related_govt_units"].upper()
        if flag not in {"YES", "NO"}:
            raise ValueError("unknown related_govt_units flag")
        timestamps.add(row["data_as_of"])
        if flag == "YES":
            continue
        type_code = row["fund_type_code"]
        if type_code not in FUND_GROUPS:
            raise ValueError(f"unknown fund type: {type_code}")
        key = (type_code, row["fund_code"])
        fund = funds.setdefault(key, {
            "fundTypeCode": type_code, "fundType": row["fund_type"],
            "fundGroup": FUND_GROUPS[type_code], "fundCode": row["fund_code"],
            "fund": row["fund"], "revenueGroups": defaultdict(int),
            "spendingGroups": defaultdict(int),
        })
        if fund["fund"] != row["fund"] or fund["fundType"] != row["fund_type"]:
            raise ValueError(f"conflicting fund labels: {key}")
        amount = cents(row["amount"])
        side = row["revenue_or_spending"]
        if side == "Revenue":
            raw_totals["Revenue"] += amount
            code = row["character_code"]
            if code not in REVENUE_CODES:
                raise ValueError(f"unknown revenue character: {code}")
            fund["revenueGroups"][REVENUE_CODES[code]] += amount
        elif side == "Spending":
            raw_totals["Spending"] += amount
            code = row["organization_group_code"]
            label = row["organization_group"]
            if code in org_labels and org_labels[code] != label:
                raise ValueError(f"conflicting organization group label: {code}")
            org_labels[code] = label
            fund["spendingGroups"][code] += amount
        else:
            raise ValueError(f"unknown revenue_or_spending: {side}")
    if count == 0 or not funds:
        raise ValueError("empty source")
    if len(timestamps) != 1 or not next(iter(timestamps)):
        raise ValueError("mixed data_as_of values")
    grouped_totals = {
        "Revenue": sum(sum(f["revenueGroups"].values()) for f in funds.values()),
        "Spending": sum(sum(f["spendingGroups"].values()) for f in funds.values()),
    }
    if grouped_totals != raw_totals:
        raise ValueError("grouped totals do not reconcile")
    return {
        "fiscalYear": fiscal_year, "dataAsOf": next(iter(timestamps)),
        "processedAt": processed_at, "sourceUrl": SOURCE_URL,
        "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "organizationGroups": dict(sorted(org_labels.items())),
        "funds": [funds[key] for key in sorted(funds)],
    }


def write_if_changed(snapshot: dict, path: Path) -> bool:
    if path.exists() and json.loads(path.read_text(encoding="utf-8"))["sourceSha256"] == snapshot["sourceSha256"]:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(snapshot, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--fiscal-year", default="2025")
    args = parser.parse_args()
    now = datetime.now(timezone.utc).isoformat()
    snapshot = build_snapshot(args.input.read_bytes(), args.fiscal_year, now)
    changed = write_if_changed(snapshot, args.output)
    print(f"FY{args.fiscal_year}: {len(snapshot['funds'])} funds; {'updated' if changed else 'unchanged'}")
