# Usability framework for the City Ledger

## Reference review

| Reference | Useful pattern | Application here |
| --- | --- | --- |
| [USAspending Spending Explorer](https://www.usaspending.gov/explorer) | Starts from a few understandable routes into spending, then drills into smaller categories. | Keep the opening chart as the entry point and identify the current classification level at every step. |
| [NYC Databook Procurement](https://databook.nyc/procurement) | Puts headline totals up front, then offers distinct routes to vendors, contracts, and transactions. It labels committed and paid amounts separately. | Keep recorded spending, paid vouchers, and outcomes visually separate and name the accounting basis beside each number. |
| [Our World in Data spending chart](https://ourworldindata.org/grapher/historical-gov-spending-gdp?tab=table) | Pairs figures with definitions, coverage, source, update date, and a tabular view. | Keep fiscal year comparisons beside current amounts and source/definition details near related measures. |
| [GOV.UK chart guidance](https://brand.design-system.service.gov.uk/data/charts/) and [dashboard guidance](https://brand.design-system.service.gov.uk/data/dashboards/) | Favors concise labels, readable hierarchy, direct sources, and short guidance that supports exploration. | Increase dense text sizes, simplify path navigation, and use motion only to show what moved. |

These are patterns drawn from the published interfaces and guidance, not a claim that the sites have identical data models or verified usability scores.

## Framework

1. **Orient:** A visitor can tell where they are, which level is selected, and what level comes next without reading a long explanation.
2. **Scan:** Names, amounts, shares, and prior-year changes are legible at desktop and phone widths. Numeric values align and labels remain readable when they wrap.
3. **Follow:** A click preserves context. Existing categories remain in place; only the newly revealed level enters with light motion. Returning to an earlier level is one action.
4. **Trust:** Recorded spending, vendor vouchers, and department measures remain separate. Each comparison names its year; source links and definitions stay close to the relevant figures.
5. **Access:** Essential meaning is in text as well as color or motion. Keyboard focus, reduced-motion settings, and narrow layouts retain the same path and figures.

## Changes in this pass

- Add a level number to each classification column header.
- Keep the spending path on one scrollable line, following the active endpoint on navigation rather than growing into several rows.
- Raise the type scale and spacing of branch rows, comparison text, and related records.
- Preserve existing column and chart DOM during navigation; continue using only short, functional movement for columns that change position.

## Acceptance checks

- At a deep path, the breadcrumb stays one row high on a narrow viewport and the final item is reachable.
- A selected branch stays in its ranked position, while sibling amounts and prior-year changes remain legible.
- No page-wide horizontal overflow at 390 px; reduced-motion preference removes movement.
- The spending and outcome test suites pass and the staged site still reaches payees and vouchers.
