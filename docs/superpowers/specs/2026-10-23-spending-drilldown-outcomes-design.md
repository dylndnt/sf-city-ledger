# Spending drilldown and related outcomes

## Purpose

Let readers start at a spending organization group, descend through the city's department, program, character, object, and sub-object classifications, and inspect named payees where public vendor payments exist. Show published department performance measures beside the spending path without implying that a payment caused an outcome.

## Sources and meaning

- The existing [Spending and Revenue](https://data.sf.gov/d/bpnb-jwfb) FY2025 snapshot is the source for *all recorded spending*. Keep its signed amounts, related-government-unit exclusion, fund filtering, and weekly refresh.
- [Vendor Payments (Vouchers)](https://data.sf.gov/d/n9pm-xkyq) is a separate, public subset of spending. Query it on demand after a user reaches a spending path. Show paid vouchers, record dates, and a distinct source link. Do not add or subtract these figures from the accounting-actual total or label their difference “unaccounted.” Vendor names are payees, not necessarily service providers responsible for an outcome.
- [Scorecard Measures](https://data.sf.gov/d/kc49-udxn) provides observed department measures. Show only departments with an explicit name mapping. Display the latest value observed during FY2025 for each measure with its observation date, definition, and source. Do not compare targets unless their reporting periods are verified. Label these as related department outcomes, not causal evidence for a program or vendor.

## Interaction

The existing overview and fund selection remain. Spending group rows become buttons. A drilldown below the three overview panels shows a breadcrumb, selected-path accounting total, and the next classification level sorted by signed amount. Every row shows its signed amount. At the sub-object level, identify the responsible department and query matching paid vendors. Users may reset to all spending or select another branch. The current fund selection applies to the entire drilldown and vendor query.

At a sub-object, selecting a payee opens its individual public vouchers with purchase order and contract fields where supplied. Once a department is selected, show its related outcome measures. If no mapped measures or observed FY2025 values exist, say so and retain the source link. Vendor and outcome requests have independent loading and failure states; a failed third-party request does not erase accounting actuals.

## Data and boundaries

The static snapshot gains compact spending records with code and label fields for organization group, department, program, character, object, sub-object, fund type, fund, and signed amount in cents. Validate required columns and reconcile their signed sum to the existing spending total. The browser groups these records for each click; it never guesses a vendor from an accounting row. Build DataSF queries only from selected source codes and use URL encoding. Escape all source text in HTML. Keep results limited and identify truncation rather than silently presenting a partial list as complete.

## Verification

Test snapshot reconciliation, scoped hierarchy totals, query construction, source-text escaping, and empty/error states. Run existing Python and Node tests plus a local browser check of the drilldown and vendor/outcome states.
