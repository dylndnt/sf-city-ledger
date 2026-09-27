# San Francisco actual revenue and spending: first release design

Date: 2026-09-27

## Purpose

Give a visitor a truthful, quick picture of where San Francisco's recorded money came from, which funds held it, and which broad service areas recorded spending. Start with one completed fiscal year, FY2025 (July 1, 2024 through June 30, 2025). This site reports actuals, not the adopted budget or cash transactions.

## Source and scope

Use the Controller's [Spending and Revenue dataset](https://data.sf.gov/d/bpnb-jwfb), dataset ID `bpnb-jwfb`. The local FY2025 source snapshot and profiling notes are in `data/` and `DATA_NOTES.md`. The source contains accounting summaries, with fields for fiscal year, revenue/spending, character, fund type, fund, fund category, organization group, department, amount, and data-as-of timestamp.

The default view excludes rows whose `related_govt_units` flag is `YES`, matching SFOpenBook's default. Retain all rows in the downloaded source. Use signed amounts, including transfer adjustments, in every total. Do not remove negative rows merely to simplify a chart. For the current snapshot, the default-view totals are $18,830,184,131.21 recorded revenue and $18,176,493,730.33 recorded spending. These totals are independent and their difference is not labeled a surplus or deficit.

The city's [fund structure description](https://media.api.sf.gov/documents/70_CSF_Proposed_Budget_Book_June_2024_Final_REV1_0525v2_UMl4gFg.pdf) and [OpenBook glossary](https://openbook-report.sfgov.org/ccsf_content/SpendingRevenueHelp/glossary.html) define funds as the organizing layer between sources and uses. A record's fund establishes where revenue was recorded or where spending was charged. It does not identify which particular revenue dollar paid for which expense. The [OpenBook reporting notes](https://openbook-report.sfgov.org/ccsf_content/SpendingRevenueHelp/about.html) explain why revenue and spending can differ within one year.

## First screen

Title: **San Francisco's money in and out**. Subtitle: **FY2025 actuals (July 2024–June 2025)**. Show the Controller's source `data_as_of` date and a link to the dataset near the title. Label amounts as nominal US dollars.

Use three columns on desktop and a stacked sequence on mobile:

1. **Recorded revenue**: total and five category bars, each labeled with dollars and percent of the selected scope's revenue. Categories are Taxes; Charges for services; Intergovernmental revenue; Other operating revenue; and Financing, transfers and recoveries (net of adjustments).
2. **Funds**: four cards in the initial citywide view: General Fund, Enterprise Funds, Special Revenue Funds, and Other funds. Each card displays its own recorded revenue and recorded spending as separate figures. Other funds groups Debt Service, Capital Projects, Internal Service, and Permanent Fund. Show both figures because they do not necessarily balance in one year.
3. **Recorded spending**: total and the seven `organization_group` categories supplied by the city, each labeled with dollars and percent of the selected scope's spending. Preserve the full source name “Public Works, Transportation & Commerce.”

Selecting a fund card filters the revenue and spending columns to records in that fund type group. An expanded list lets the visitor select an individual source `fund_code` within that group and shows its source fund name. A clear “All city funds” action returns to the overview. The current selection stays visible in the heading and in a text summary. One selection applies to both sides.

The visual uses three aligned panels and a shared highlight color for the selected fund. It does not draw continuous source-to-service ribbons or claim that a tax source funded a specific spending category. This is a fund classification view rather than a conservation-style Sankey.

Revenue bars support signed values. Negative groups extend left of zero and show their signed dollar amount. This matters when a selected fund has net negative transfer or financing activity. A short “How to read this” note explains that transfers and work orders can be recorded on both sides and the city's signed adjustments reduce double counting. The site never drops these adjustments from totals.

## Category mapping

Map by stable `character_code`, while displaying the city's character labels in detail. Revenue groups are:

| Display group | `character_code` values |
| --- | --- |
| Taxes | `PROP_TAX`, `BUS_TAX`, `OTHER_LOC_TAX` |
| Charges for services | `CHGS_FOR_SERVICES` |
| Intergovernmental revenue | `INTER_REV_FED`, `INTERGOV_REV_ST`, `INTERGOV_REV_OTH` |
| Other operating revenue | `RENTS_CONCESSIONS`, `INT_INV_INC`, `FINE_FORF_PENAL`, `LIC_PERM_FRAN`, `OTH_REV` |
| Financing, transfers and recoveries (net of adjustments) | `OTH_FIN_SRCS`, `INTRAFD_TFR_IN`, `OPER_TFR_IN`, `TFR_IN_CAP_EXP`, `EXP_RECOVERY`, `CONVRSN_REV_ACCTS`, `ELS` |

Every FY2025 revenue character code is mapped exactly once. A future unknown code fails the refresh validation and requires an explicit mapping decision before publication. Spending uses the city's `organization_group_code` and label without inventing a service taxonomy.

## Data refresh and publication

Use a static site fed by generated JSON. A scheduled GitHub Actions job runs each Monday after the city's usual Sunday update. It fetches the chosen fiscal year from the public DataSF API, saves a dated raw snapshot and source metadata as workflow artifacts, and produces a small JSON file containing revenue group totals by fund type and fund code, spending organization group totals by fund type and fund code, citywide totals, source URL, `data_as_of`, and processing time. The published JSON is versioned in the site repository so the last valid snapshot remains available. If an application token is needed for rate limits, store it as a job secret, never in browser code.

Validate before publication: fiscal year is the requested one; the response is nonempty and below the configured API row limit; required columns are present; amount values parse as signed numbers; `data_as_of` values are consistent; related-unit flags are recognized; every revenue character and fund type code has a mapping; and revenue/spending sums at each grouping level reconcile to the filtered raw rows within one cent. Missing or renamed required columns and unknown category codes fail validation. Publish the new JSON only after all checks pass. If the source has not changed, keep the existing published file.

On failure, retain the last valid JSON and notify the maintainer through the job's failure mechanism. Continue showing its true data-as-of date. If that date is more than 14 days behind the present date for an active year, display a plain “Data update delayed” note. FY2025 is a completed year; the site does not flag a stable audited year as delayed merely because its figures stop changing.

The first release shows FY2025. The same pipeline can fetch later fiscal years, but changing the public default year requires a deliberate review because the dataset does not include an audited/closed flag. A later release can add a current-year-to-date option after defining its partial-year labeling.

## Verification

Before launch, independently sum the raw FY2025 rows for the default related-unit filter and confirm that the JSON and on-screen totals match. Check each revenue character code maps once, all four fund cards sum to the citywide amount on each side, the individual funds sum to their parent card, and the seven spending groups sum to total spending. Include a selected General Fund check that preserves its negative net financing/transfers category. Check keyboard access, readable labels at mobile width, source and as-of links, and the last-valid-snapshot behavior when the refresh fails.

## First-release boundary

The first release covers one fiscal year and the fund structure above. It does not compare adopted budget with actuals, trace individual dollars from tax to program, calculate a fund surplus or deficit, show vendor payments, or provide neighborhood-level allocations. These require additional data definitions and can be considered after the overview is working.
