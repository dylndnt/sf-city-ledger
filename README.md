# San Francisco's money in and out

A small static view of San Francisco's **FY2025 recorded actual revenue and spending** (July 1, 2024 through June 30, 2025). The opening Sankey shows revenue sources, **funds in the middle**, and spending areas; it does not assert that an individual revenue dollar paid for an individual service. Hover over or focus a ribbon to see its exact amount. One negative General Fund financing/transfer adjustment appears as a red reverse link. Exact category and individual-fund breakdowns are under **Explore details**. The source is the Controller's [Spending and Revenue dataset](https://data.sf.gov/d/bpnb-jwfb).

The committed `public/data/fy2025.json` is ready to serve without a live API call. It excludes related governmental units from displayed totals, retains signed transfer adjustments, and shows the city's `data_as_of` date. The original FY2025 CSV and source documentation are in `data/`.

## Follow spending to departments, payees, and results

Open **Explore details** and select a spending area. The drilldown follows the Controller's FY2025 accounting classifications: organization group → department → program → spending character → object → sub-object. Every level keeps the selected city fund scope and shows signed recorded spending. A breadcrumb lets you move back up the path.

At a sub-object, the page queries the Controller's [Vendor Payments (Vouchers)](https://data.sf.gov/d/n9pm-xkyq) dataset for matching paid vouchers and shows named payees, 50 at a time. Select a payee to see individual public voucher, purchase order, and contract details. Vendor payments are a **subset of spending** from a different report and accounting basis. They may not sum to the accounting actuals shown above them; a missing public voucher does not imply missing spending. DataSF currently serves this lookup live, so vendor results require network access and may have source dates different from the committed FY2025 snapshot.

For departments with an explicit match, the page also shows observed values from the city's [Scorecard Measures](https://data.sf.gov/d/kc49-udxn) dataset. It uses the latest observation dated within FY2025 for each measure and provides the definition and method. The reporting period can differ by measure, so the page does not compare values to published targets without checking their periods. These are **related department outcomes**, not evidence that a particular program or vendor payment caused them. Departments without published matching measures are labeled as such.

## Local preview

Requires Python 3.13 and Node.js 22. From the repository root:

```sh
python -m unittest discover -s tests -v
node --test tests/*.test.mjs
python -m http.server 8000 --directory public
```

Open `http://localhost:8000`. A `file://` page will not load the JSON through `fetch`.

To rebuild the site JSON from the committed source snapshot:

```sh
python -m scripts.build_data --input data/spending-revenue-fy2025.csv --output public/data/fy2025.json
```

To fetch the latest FY2025 city file and source metadata manually:

```sh
python -m scripts.refresh_data
```

The refresh saves the raw inputs under `build/source/` for inspection. The published JSON changes only after validation succeeds. A malformed or suspiciously short download leaves the last valid file in place. A source change that introduces an unknown revenue or fund type code requires a deliberate mapping update.

## Weekly publication

The GitHub Actions workflow runs **Monday at 20:00 UTC**, after the city's usual Sunday update, and can also run manually. It tests the transformation and page model, downloads the current source, validates it, archives the raw inputs as a workflow artifact, and commits a changed JSON snapshot. If refresh fails, the last valid JSON remains committed and the run fails so the maintainer can investigate. The page always displays the city's actual as-of date.

To publish the website, configure GitHub Pages with **GitHub Actions** as the source and set the repository variable `PAGES_ENABLED` to `true`. The workflow then deploys `public/` after each validated refresh, or the last valid committed JSON if a refresh fails. GitHub's free plan does not support Pages for a private repository; use a public repository or a plan that supports private-repository Pages. The workflow requests `contents: write` for its own run so it can commit a changed snapshot; the repository's default workflow permission can remain read-only. Optionally add a `SOCRATA_APP_TOKEN` repository secret if the public API rate limit becomes a problem. The token is used only in the server-side job.

FY2025 is the only published year. Choose a newer default year only after checking its completeness and the fund and revenue code mapping; the dataset does not provide an explicit audited or closed flag.
