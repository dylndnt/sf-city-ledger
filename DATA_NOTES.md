# San Francisco actuals: FY2025 source snapshot

## Source and files

- Primary source: [DataSF Spending and Revenue](https://data.sf.gov/d/bpnb-jwfb), maintained by the Controller's Office and updated weekly. The source is a summary of the city's accounting system, not a cash transaction ledger.
- Fiscal year: 2025, July 1, 2024 through June 30, 2025.
- Downloaded snapshot: data as of September 20, 2026; loaded September 21, 2026.
- `data/spending-revenue-fy2025.csv`: all 26,672 FY2025 rows, filtered only by `fiscal_year='2025'`. SHA-256: `65AE9E7014C6DB5E9217BBE2437BE0A2DFB3A2A1DAB80B9074F24334B5DEDB5D`.
- `data/source-metadata.json`: DataSF dataset metadata and column definitions.
- `data/data-dictionary.pdf`: Controller's Office data dictionary.
- `data/revenue-by-character-fy2025.csv` and `data/spending-by-organization-group-fy2025.csv`: working summaries using the city's default exclusion of related governmental units. These are derived from the complete raw CSV and include signed transfer-adjustment entries.
- `data/fund-type-summary-fy2025.csv`: revenue and spending totals by the source's `fund_type` classification, using the same default exclusion. `difference` is the within-year arithmetic difference, not a fund surplus or deficit.

## Initial checks

- The CSV has 26,672 rows, all labeled FY2025 and sharing one `data_as_of` timestamp.
- The `related_govt_units` field has 25,869 `NO` rows and 803 `YES` rows. The city's [OpenBook notes](https://openbook-report.sfgov.org/ccsf_content/SpendingRevenueHelp/about.html) say related governmental units are excluded in its default view.
- No rows are missing fiscal year, related-unit flag, revenue/spending flag, character, organization group, amount, or data-as-of date.
- For the default view (`related_govt_units=NO`), signed sums are $18,830,184,131.21 of revenue and $18,176,493,730.33 of spending. These are *not* a cash surplus calculation. The city notes that receipt and spending can occur in different years.
- The data has explicit negative transfer-adjustment records. The city's [glossary](https://openbook-report.sfgov.org/ccsf_content/SpendingRevenueHelp/glossary.html) explains that these remove double counting. Any chart grouping must retain their effect and explain it.

## Proposed first-screen grouping for review

Revenue characters could be grouped as taxes ($5.83B), charges for services ($4.88B), intergovernmental revenue ($3.58B), other operating revenue ($1.82B), and financing, transfers and recoveries net of adjustments ($2.71B). These five groups sum to the signed revenue total. The last group needs a plain-language explanation because it combines positive transfers and recoveries with negative transfer adjustments.

Spending can use the seven `organization_group` values supplied by the city. Public Works, Transportation & Commerce is the largest at $8.04B (44.2% of the default-view total); it includes enterprise activities and should not be shortened to “Public Works.”

## Refresh approach to consider after design approval

The city says the current fiscal year updates weekly, usually Sunday night, and audited years close. A website refresh every Monday would therefore match the source cadence. A faster website poll would not make the underlying figures more current.

Proposed pipeline:

1. A scheduled job queries the DataSF API for the chosen fiscal year and saves the raw response plus dataset metadata. It records the city's `data_as_of` value separately from the job run time.
2. The job applies the selected related-government-units rule and stable category mappings. It retains signed transfer adjustments. It checks that the fiscal year and timestamps are consistent, required fields are present, row count is plausible, and category sums reconcile to the signed source totals.
3. On success, the job publishes a small versioned JSON snapshot for the site. On failure or an unexpected source change, the previous valid snapshot remains live and the site displays its actual as-of date. The job reports the failure to the maintainer.
4. The first screen uses FY2025. The job can ingest later years with the same logic, but changing the default year requires a deliberate publication decision because the source does not provide an explicit audited/closed flag.

The API is public; Socrata says an application token raises request limits. A weekly server-side job can use a token if needed, keeping it out of browser code.

## Fund layer and Sankey limitation

The city's [budget book](https://media.api.sf.gov/documents/70_CSF_Proposed_Budget_Book_June_2024_Final_REV1_0525v2_UMl4gFg.pdf) explains that public financial activity is planned and recorded in funds reflecting restrictions on use. The [OpenBook glossary](https://openbook-report.sfgov.org/ccsf_content/SpendingRevenueHelp/glossary.html) defines Fund Type, Fund, and Fund Category as a hierarchy. The raw actuals include all three fields, so both sides can be grouped by fund type or individual fund.

For FY2025, the default-view General Fund has $5.60B recorded revenue and $5.70B recorded spending; Enterprise Funds have $9.84B and $9.29B respectively; Special Revenue Funds have $2.63B and $2.47B. These are independent within-year amounts. Their differences cannot be labeled a surplus, deficit, or change in fund balance from this source alone.

This permits an honest three-column *fund map*: revenue categories recorded in each fund type on the left, fund types in the middle with separate received and spent totals, and spending organization groups charged to each fund type on the right. It does not trace a specific revenue dollar to a specific expense. A conservation-style Sankey would need balancing flows that are not available in the OpenBook dataset. In addition, net revenue after transfer adjustments is negative for the General Fund's proposed “Financing, transfers and recoveries” category, and standard Sankey ribbons cannot faithfully encode negative links. Keep signed adjustments in the totals and explain them rather than suppressing them for appearance.
