# The City Ledger

An interactive view of San Francisco's FY2025 recorded revenue and spending. The opening chart shows revenue sources, fund groups, and spending areas. Select a spending area or its ribbon to open a branching view of departments, programs, spending types, objects, and sub-objects. Each step highlights the selected category in its ranked position beside muted, clickable siblings and the next choices. The path buttons return to earlier levels. Short descriptions explain each classification level; compact disclosure controls explain limits of related outcome and vendor data.

The accounting charts use committed, validated [FY2025 and FY2024 Spending and Revenue snapshots](https://data.sf.gov/d/bpnb-jwfb). Each spending branch shows its FY2025 signed total, FY2024 total, and change for the same classification and fund scope. The two fiscal years are July 2024–June 2025 and July 2023–June 2024. Related governmental units are excluded, matching the city's default view. Revenue and spending are independent totals; ribbons do not trace specific revenue dollars to expenses.

At a sub-object, the site queries [Vendor Payments (Vouchers)](https://data.sf.gov/d/n9pm-xkyq) for matching named payees and individual public voucher, purchase order, and contract records. These payments use a different accounting basis and may not sum to the recorded spending above them. Live vendor results require network access.

For departments with a published match, the site queries [Scorecard Measures](https://data.sf.gov/d/kc49-udxn). It compares each measure's latest observation dated within FY2025 with its latest observation in FY2024, shows both observation dates and the signed change, and provides the definition and method. Percentage changes are percentage points. These measures describe a department; they do not establish that a particular program or vendor payment caused an outcome.

## Local preview

Requires Python 3.13 and Node.js 22. From the repository root:

```sh
python -m unittest discover -s tests -v
node --test tests/*.test.mjs
python -m http.server 8000 --directory public
```

Open `http://localhost:8000`. A `file://` page will not load the snapshots through `fetch`.

To refresh both snapshots from DataSF:

```sh
python -m scripts.refresh_data
python -m scripts.refresh_data --fiscal-year 2024 --output public/data/fy2024.json
```
