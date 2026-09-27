# FY2025 Actuals Fund View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a small, accessible FY2025 San Francisco actuals site with revenue, fund, and spending views backed by a safe weekly data refresh.

**Architecture:** A Python standard-library builder turns DataSF CSV rows into a checked JSON snapshot, keeping signed amounts in integer cents. A static HTML/CSS/JavaScript page reads that snapshot, filters both sides by the selected fund, and shows the source date. GitHub Actions checks for source updates each Monday, validates before replacing the published JSON, and deploys the static directory.

**Tech Stack:** Python 3.13 standard library, Node.js 22 built-in test runner, HTML/CSS/ES modules, GitHub Actions, GitHub Pages. No runtime npm packages or server database.

## Global Constraints

- Use FY2025, July 1, 2024 through June 30, 2025, for the first public view.
- Exclude `related_govt_units=YES` from displayed totals; retain all source rows in the downloaded snapshot.
- Keep signed transfer adjustments and show negative grouped values with a zero axis.
- Label revenue and spending as separately recorded actuals; never label their difference a surplus or deficit or draw a continuous source-to-service ribbon.
- Show the city-provided `data_as_of` date and a link to `https://data.sf.gov/d/bpnb-jwfb`.
- The completed FY2025 default has no stale-data alarm. A later current-year view will use the 14-day warning rule from the spec.
- Match the category mapping and fund grouping in `docs/superpowers/specs/2026-09-27-san-francisco-actuals-fund-view-design.md`.

## File map

- `scripts/__init__.py`, `scripts/build_data.py`: importable package, pure CSV validation, aggregation, and atomic JSON publication; offline CLI for the first snapshot.
- `tests/test_build_data.py`: source, mapping, signed amount, and publication checks.
- `public/data/fy2025.json`: generated and committed snapshot used by the page.
- `public/model.mjs`: selection and amount formatting independent of the DOM.
- `public/view.mjs`: accessible HTML markup from the selected model.
- `public/app.mjs`: browser fetch and event handlers.
- `public/index.html`, `public/styles.css`: static document and responsive layout.
- `tests/model.test.mjs`: fund-selection, negative-value, and markup tests.
- `scripts/refresh_data.py`: DataSF fetch and source artifact capture.
- `tests/test_refresh_data.py`: failure-preservation test for the network wrapper.
- `.github/workflows/refresh-and-deploy.yml`: test, weekly refresh, last-valid-snapshot preservation, and Pages deployment.
- `.gitignore`: local Python caches and downloaded workflow artifacts.
- `README.md`: local preview and GitHub setup.

---

### Task 1: Build a checked FY2025 JSON snapshot

**Files:**
- Create: `scripts/__init__.py` (empty), `scripts/build_data.py`
- Create: `tests/test_build_data.py`
- Create: `public/data/fy2025.json` (generated)

**Interfaces:**
- Consumes: UTF-8 CSV bytes with the columns in `data/spending-revenue-fy2025.csv`.
- Produces: `build_snapshot(raw: bytes, fiscal_year: str, processed_at: str) -> dict` and `write_if_changed(snapshot: dict, path: Path) -> bool`. JSON contains `fiscalYear`, `dataAsOf`, `processedAt`, `sourceUrl`, `sourceSha256`, `organizationGroups`, and `funds`. Each fund has `fundTypeCode`, `fundType`, `fundGroup`, `fundCode`, `fund`, `revenueGroups`, and `spendingGroups`, with amounts in integer cents.

- [ ] **Step 1: Write the failing data tests** in `tests/test_build_data.py`.

```python
import csv
import io
import json
import tempfile
import unittest
from pathlib import Path

from scripts.build_data import build_snapshot, write_if_changed


FIELDS = ["fiscal_year", "related_govt_units", "revenue_or_spending",
          "character_code", "organization_group_code", "organization_group",
          "fund_type_code", "fund_type", "fund_code", "fund", "amount", "data_as_of"]


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


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the tests and confirm they fail because the builder is absent.** Run `python -m unittest discover -s tests -p 'test_build_data.py' -v`. Expected: import failure for `scripts.build_data`.

- [ ] **Step 3: Write the minimum builder** in `scripts/build_data.py`.

```python
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
REQUIRED = {"fiscal_year", "related_govt_units", "revenue_or_spending",
            "character_code", "organization_group_code", "organization_group",
            "fund_type_code", "fund_type", "fund_code", "fund", "amount", "data_as_of"}
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
        "EXP_RECOVERY", "CONVRSN_REV_ACCTS", "ELS")},
}
FUND_GROUPS = {
    "GEN_FUND": "General Fund", "ENT_FUND": "Enterprise Funds",
    "SP_REV": "Special Revenue Funds", "DEBT_SRVC": "Other funds",
    "CPTL_PRJ": "Other funds", "INTRL_SRVC": "Other funds",
    "PERMA_FUND": "Other funds",
}


def cents(value):
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
```

- [ ] **Step 4: Run tests, generate the first JSON, and inspect its totals.** Run `python -m unittest discover -s tests -p 'test_build_data.py' -v`; expected: 4 tests pass. Run `python -m scripts.build_data --input data/spending-revenue-fy2025.csv --output public/data/fy2025.json --fiscal-year 2025`; expected: a nonempty JSON file. Independently sum its fund group cents and compare to $18,830,184,131.21 revenue and $18,176,493,730.33 spending from `DATA_NOTES.md`.

- [ ] **Step 5: Commit the builder, tests, and generated JSON.** Run `git add scripts/__init__.py scripts/build_data.py tests/test_build_data.py public/data/fy2025.json`, then `git commit -m "Build validated FY2025 actuals snapshot"`.

### Task 2: Build the three-column fund view

**Files:**
- Create: `public/model.mjs`, `public/view.mjs`, `public/app.mjs`, `public/index.html`, `public/styles.css`
- Create: `tests/model.test.mjs`

**Interfaces:**
- Consumes: Task 1 JSON schema and the current `{group, fundCode}` selection.
- Produces: `selectScope(data, group, fundCode)` with revenue/spending group sums and totals, and `render(data, group, fundCode)` returning complete markup for the document's `<main>`.

- [ ] **Step 1: Write failing model and markup tests** in `tests/model.test.mjs`.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { selectScope } from '../public/model.mjs';
import { render } from '../public/view.mjs';

const data = {
  fiscalYear: '2025', dataAsOf: '2026-09-20T23:05:20.000',
  sourceUrl: 'https://data.sf.gov/d/bpnb-jwfb',
  organizationGroups: { '01': 'Public Protection', '04': 'Community Health' },
  funds: [
    { fundGroup: 'General Fund', fundCode: 'GF~1', fund: 'General Fund',
      revenueGroups: { Taxes: 10000, 'Financing, transfers and recoveries': -2000 },
      spendingGroups: { '01': 5000 } },
    { fundGroup: 'Enterprise Funds', fundCode: 'ENT~1', fund: 'Transit',
      revenueGroups: { 'Charges for services': 9000 }, spendingGroups: { '04': 7000 } },
  ],
};

test('one selection filters both revenue and spending', () => {
  const city = selectScope(data, 'All city funds', '');
  assert.equal(city.revenueTotal, 17000);
  assert.equal(city.spendingTotal, 12000);
  const general = selectScope(data, 'General Fund', '');
  assert.equal(general.revenueTotal, 8000);
  assert.equal(general.spendingTotal, 5000);
  assert.equal(general.revenue['Financing, transfers and recoveries'], -2000);
  assert.equal(selectScope(data, 'General Fund', 'GF~1').funds.length, 1);
});

test('markup names the selected fund and preserves negative signs', () => {
  const html = render(data, 'General Fund', 'GF~1');
  assert.match(html, /General Fund/);
  assert.match(html, /-$20/);
  assert.match(html, /Public Protection/);
  assert.match(html, /Data as of/);
  assert.doesNotMatch(html, /surplus|deficit/i);
});
```

- [ ] **Step 2: Run `node --test tests/model.test.mjs` and confirm import failures.** Expected: `ERR_MODULE_NOT_FOUND` for `public/model.mjs` or `public/view.mjs`.

- [ ] **Step 3: Implement `public/model.mjs` and `public/view.mjs`.** Use integer cents throughout aggregation. The ordered revenue labels are `Taxes`, `Charges for services`, `Intergovernmental revenue`, `Other operating revenue`, `Financing, transfers and recoveries`. The ordered fund cards are `General Fund`, `Enterprise Funds`, `Special Revenue Funds`, `Other funds`. `selectScope` must filter by group and optional fund code, sum both sides independently, and reject a fund code outside the chosen group. `render` must escape source labels as HTML, show dollar amounts and shares, include a zero-axis and a negative-bar class for signed values, mark the selected card with `aria-pressed`, offer an individual-fund `<select>` after group selection, and put the source link and accounting note in visible text. Keep the two independent totals on each fund card.

```js
// public/model.mjs
export const fundOrder = ['General Fund', 'Enterprise Funds', 'Special Revenue Funds', 'Other funds'];
export const revenueOrder = ['Taxes', 'Charges for services', 'Intergovernmental revenue',
  'Other operating revenue', 'Financing, transfers and recoveries'];

const add = (target, values) => {
  for (const [key, cents] of Object.entries(values)) target[key] = (target[key] ?? 0) + cents;
};

export function selectScope(data, group = 'All city funds', fundCode = '') {
  const candidates = data.funds.filter(f => group === 'All city funds' || f.fundGroup === group);
  if (fundCode && !candidates.some(f => f.fundCode === fundCode)) throw new Error('fund outside selected group');
  const funds = fundCode ? candidates.filter(f => f.fundCode === fundCode) : candidates;
  const revenue = {}, spending = {};
  for (const fund of funds) { add(revenue, fund.revenueGroups); add(spending, fund.spendingGroups); }
  return {
    funds, revenue, spending,
    revenueTotal: Object.values(revenue).reduce((a, b) => a + b, 0),
    spendingTotal: Object.values(spending).reduce((a, b) => a + b, 0),
  };
}

export const money = cents => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2,
}).format(cents / 100);
export const share = (part, total) => total > 0 ? `${(100 * part / total).toFixed(1)}%` : 'n/a';
```

```js
// public/view.mjs
import { fundOrder, money, revenueOrder, selectScope, share } from './model.mjs';

const safe = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const sum = map => Object.values(map).reduce((a, b) => a + b, 0);

function bars(entries, total) {
  const scale = Math.max(1, ...entries.map(([, value]) => Math.abs(value)));
  return `<ul class="bars">${entries.map(([label, value]) => `
    <li class="bar-row">
      <div class="bar-label"><span>${safe(label)}</span><strong>${money(value)} <small>${share(value, total)}</small></strong></div>
      <div class="bar-track" aria-hidden="true"><span class="bar ${value < 0 ? 'negative' : 'positive'}" style="--width:${100 * Math.abs(value) / scale}%"></span></div>
    </li>`).join('')}</ul>`;
}

export function render(data, group = 'All city funds', fundCode = '') {
  const view = selectScope(data, group, fundCode);
  const selected = data.funds.find(f => f.fundCode === fundCode && f.fundGroup === group);
  const heading = selected ? selected.fund : group;
  const revenue = revenueOrder.map(label => [label, view.revenue[label] ?? 0]);
  const spending = Object.entries(data.organizationGroups)
    .map(([code, label]) => [label, view.spending[code] ?? 0])
    .sort((a, b) => b[1] - a[1]);
  const card = name => {
    const scope = selectScope(data, name, '');
    return `<button type="button" class="fund-card" data-group="${safe(name)}" aria-pressed="${group === name}">
      <strong>${safe(name)}</strong><span>Revenue ${money(scope.revenueTotal)}</span><span>Spending ${money(scope.spendingTotal)}</span>
    </button>`;
  };
  const options = group === 'All city funds' ? '' : `<label class="fund-picker">Individual fund
    <select id="fund-select"><option value="">All funds in ${safe(group)}</option>${data.funds
      .filter(f => f.fundGroup === group).sort((a, b) => a.fund.localeCompare(b.fund))
      .map(f => `<option value="${safe(f.fundCode)}" ${fundCode === f.fundCode ? 'selected' : ''}>${safe(f.fund)}</option>`).join('')}
    </select></label>`;
  return `<header class="page-header"><p class="eyebrow">San Francisco actuals</p>
    <h1>San Francisco's money in and out</h1><p>FY2025 (July 2024–June 2025) · Nominal US dollars</p>
    <p>Data as of <time>${safe(data.dataAsOf.slice(0, 10))}</time> · <a href="${safe(data.sourceUrl)}">Controller's source data</a></p></header>
    <div class="selection"><strong>${safe(heading)}</strong><button type="button" data-all>All city funds</button></div>
    <div class="columns">
      <section aria-labelledby="revenue-heading"><h2 id="revenue-heading">Recorded revenue</h2><p class="total">${money(view.revenueTotal)}</p>${bars(revenue, view.revenueTotal)}</section>
      <section aria-labelledby="funds-heading"><h2 id="funds-heading">Funds</h2><div class="fund-cards">${fundOrder.map(card).join('')}</div>${options}</section>
      <section aria-labelledby="spending-heading"><h2 id="spending-heading">Recorded spending</h2><p class="total">${money(view.spendingTotal)}</p>${bars(spending, view.spendingTotal)}</section>
    </div><aside class="how-to-read"><h2>How to read this</h2><p>Revenue and spending are recorded separately within each fund. Their annual totals need not match. Transfers and work orders can appear on both sides; signed adjustments reduce double counting. The chart does not trace a specific tax dollar to a specific service.</p></aside>`;
}
```

- [ ] **Step 4: Add the browser shell** below, then run `node --test tests/model.test.mjs`. Expected: both tests pass.

```html
<!-- public/index.html -->
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>San Francisco's money in and out</title><link rel="stylesheet" href="./styles.css"></head>
<body><main id="app" aria-live="polite">Loading FY2025 actuals…</main><script type="module" src="./app.mjs"></script></body></html>
```

```js
// public/app.mjs
import { render } from './view.mjs';

const root = document.getElementById('app');
let group = 'All city funds', fundCode = '', data;
const draw = () => { root.innerHTML = render(data, group, fundCode); };

root.addEventListener('click', event => {
  if (event.target.closest('[data-all]')) {
    group = 'All city funds'; fundCode = ''; draw();
    root.querySelector('[data-all]')?.focus();
    return;
  }
  const card = event.target.closest('[data-group]');
  if (card) {
    group = card.dataset.group; fundCode = ''; draw();
    [...root.querySelectorAll('[data-group]')].find(button => button.dataset.group === group)?.focus();
  }
});
root.addEventListener('change', event => {
  if (event.target.id === 'fund-select') {
    fundCode = event.target.value; draw();
    root.querySelector('#fund-select')?.focus();
  }
});

try {
  const response = await fetch('./data/fy2025.json');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  data = await response.json();
  draw();
} catch {
  root.innerHTML = '<h1>Data unavailable</h1><p>The FY2025 snapshot could not be loaded. Please try again later.</p>';
}
```

```css
/* public/styles.css */
:root{font-family:system-ui,sans-serif;color:#173047;background:#f5f7f8}*{box-sizing:border-box}
body{margin:0}main{max-width:1440px;margin:auto;padding:32px 24px 72px}
.page-header{margin-bottom:32px}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:.75rem;font-weight:800;color:#527081}
h1{font-size:clamp(2rem,4vw,3.5rem);line-height:1.1;margin:.2em 0}h2{font-size:1.1rem;margin:0 0 12px}
a{color:#086987}button,select{font:inherit}button{cursor:pointer}.selection{display:flex;align-items:center;gap:16px;margin-bottom:16px}
.selection button{background:none;border:0;color:#086987;text-decoration:underline}
.columns{display:grid;grid-template-columns:minmax(0,1fr) minmax(210px,.75fr) minmax(0,1fr);gap:16px;align-items:start}
.columns section,.how-to-read{background:#fff;border:1px solid #d6e0e5;border-radius:12px;padding:20px;box-shadow:0 5px 18px #1730470d}
.total{font-size:1.9rem;font-weight:800;margin:0 0 24px}.bars{list-style:none;padding:0;margin:0}.bar-row{margin:0 0 16px}
.bar-label{display:flex;justify-content:space-between;gap:12px;font-size:.86rem}.bar-label strong{text-align:right;white-space:nowrap}
.bar-label small{display:block;font-weight:400;color:#526674}.bar-track{display:grid;grid-template-columns:25% 75%;height:12px;margin-top:6px;background:linear-gradient(90deg,#edf1f3 24.7%,#8298a4 24.7%,#8298a4 25.3%,#edf1f3 25.3%)}
.bar{height:100%;width:var(--width);max-width:100%}.bar.positive{grid-column:2;background:#147d91}.bar.negative{grid-column:1;justify-self:end;background:#b35a3d}
.fund-cards{display:grid;gap:10px}.fund-card{border:1px solid #bed0d7;border-radius:9px;background:#f9fbfb;padding:12px;text-align:left;display:grid;gap:3px}
.fund-card[aria-pressed="true"]{border:2px solid #086987;background:#e6f4f5}.fund-card span{font-size:.85rem}
.fund-picker{display:grid;gap:6px;margin-top:16px;font-weight:650}.fund-picker select{width:100%;padding:8px;border:1px solid #8298a4;border-radius:6px}
.how-to-read{margin-top:16px;max-width:900px}.how-to-read p{margin:0;line-height:1.55}
:focus-visible{outline:3px solid #bd6f35;outline-offset:3px}
@media(max-width:850px){main{padding:20px 14px 48px}.columns{grid-template-columns:1fr}.bar-label{font-size:.9rem}}
```

- [ ] **Step 5: Preview at desktop and mobile sizes.** Run `python -m http.server 8000 --directory public`, open `http://localhost:8000`, select each fund card and one individual fund, and verify signed bars, totals, source link, full org-group labels, focus outlines, and stacked mobile layout. Compare the citywide totals to Task 1. Stop the server after inspection.

- [ ] **Step 6: Commit the page and tests.** Run `git add public/index.html public/styles.css public/model.mjs public/view.mjs public/app.mjs tests/model.test.mjs`, then `git commit -m "Show actuals by source fund and spending area"`.

### Task 3: Schedule refresh, preserve the last valid snapshot, and document setup

**Files:**
- Create: `scripts/refresh_data.py`
- Create: `.github/workflows/refresh-and-deploy.yml`
- Create: `.gitignore`
- Create: `README.md`
- Test: `tests/test_refresh_data.py`

**Interfaces:**
- Consumes: DataSF CSV endpoint filtered to `fiscal_year='2025'`, DataSF view metadata, and Task 1 `build_snapshot`/`write_if_changed`.
- Produces: refreshed `public/data/fy2025.json` only after validation; archived raw CSV and metadata in `build/source/` for the workflow run.

- [ ] **Step 1: Add a failing failure-preservation test** in `tests/test_refresh_data.py`:

```python
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


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run `python -m unittest discover -s tests -p 'test_refresh_data.py' -v` and confirm it fails with an import error because the wrapper is absent.**

- [ ] **Step 3: Write `scripts/refresh_data.py`** with a bounded HTTPS fetch and no browser token exposure.

```python
import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from scripts.build_data import build_snapshot, write_if_changed


def get(url: str) -> bytes:
    headers = {"User-Agent": "sf-actuals-fund-view/1.0"}
    token = os.environ.get("SOCRATA_APP_TOKEN")
    if token:
        headers["X-App-Token"] = token
    with urlopen(Request(url, headers=headers), timeout=45) as response:
        return response.read()


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
```

- [ ] **Step 4: Add `.github/workflows/refresh-and-deploy.yml`.** Rename the local branch to `main` before creating a remote. GitHub repository settings must allow Actions to write repository contents and must set Pages source to GitHub Actions.

```yaml
name: Refresh and deploy FY2025 actuals
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 20 * * 1'
  workflow_dispatch:
permissions:
  contents: write
  pages: write
  id-token: write
concurrency:
  group: actuals-pages
  cancel-in-progress: false
jobs:
  publish:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.13'
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: python -m unittest discover -s tests -v
      - run: node --test tests/model.test.mjs
      - run: python -m scripts.refresh_data
        env:
          SOCRATA_APP_TOKEN: ${{ secrets.SOCRATA_APP_TOKEN }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: source-snapshot
          path: build/source/
          if-no-files-found: ignore
      - name: Commit validated data if changed
        run: |
          if ! git diff --quiet -- public/data/fy2025.json; then
            git config user.name 'github-actions[bot]'
            git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
            git add public/data/fy2025.json
            git commit -m 'data: refresh FY2025 actuals'
            git push
          fi
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: public
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 5: Write `.gitignore` and `README.md`.** Put `/build/` and `__pycache__/` in `.gitignore`. The README gives these exact operating instructions: source URL and FY2025 scope; `python -m unittest discover -s tests -v` and `node --test tests/model.test.mjs`; `python -m scripts.build_data --input data/spending-revenue-fy2025.csv --output public/data/fy2025.json`; `python -m http.server 8000 --directory public`; GitHub Pages must use the GitHub Actions source and Actions must have write permission; optional `SOCRATA_APP_TOKEN` secret; Monday 20:00 UTC refresh; failed validation leaves the committed JSON untouched; select a new default year only after reviewing completeness and the fund/code mapping.

- [ ] **Step 6: Verify locally.** Run both test suites, run `python -m scripts.refresh_data` twice against the live city API, and verify the second run reports `unchanged` when the source is stable. The first run may report `updated` if the city revised FY2025 after the saved snapshot. Simulate an invalid source with the preservation test. Run `git diff --check`; expected: no whitespace errors.

- [ ] **Step 7: Commit the workflow and docs.** Run `git add scripts/refresh_data.py .github/workflows/refresh-and-deploy.yml .gitignore README.md tests/test_refresh_data.py`, then `git commit -m "Refresh and deploy validated actuals weekly"`.

## Final acceptance

- Both automated suites pass from a clean checkout.
- The first JSON matches the independently checked FY2025 revenue and spending totals to the cent.
- Selecting a fund type or individual fund updates both sides; selecting All city funds restores the overview.
- Signed transfer-adjusted values remain visible and the page never presents the revenue/spending difference as a surplus.
- Desktop and mobile inspection shows readable labels, visible focus, and working source link.
- The scheduled workflow runs successfully after a GitHub remote and Pages are configured; its first run proves publication and source artifact capture.
