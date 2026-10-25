# Chart zoom and year comparison implementation plan

**Goal:** Make the opening spending chart the interactive entry point, with in-place category zoom and prior-year comparisons.

**Design:** The existing revenue/fund/spending Sankey is the opening state. Spending nodes and spending ribbons become keyboard-accessible selection targets. Selecting one replaces the same chart frame with a focused parent-to-children flow, and each child opens the next classification depth. A path rail in that frame returns to any ancestor. Department measures and leaf payees appear alongside the focused chart after selection. The opening screen has no separate detail disclosure.

**Data:** Publish a validated FY2024 accounting snapshot using the same transformation as FY2025. Compare signed totals for identical category codes and selected fund scope. Request Scorecard observations for both FY2024 and FY2025, pairing each measure's latest observation in each fiscal year. Display both observation dates; treat missing prior observations as unavailable. Paid vendor vouchers remain separately labeled and are never presented as a reconciliation of accounting actuals.

## Tasks

1. Add tests for FY2024 matching by path and safe signed year-over-year change; fetch the city FY2024 source and build the static snapshot.
2. Add tests for two-year Scorecard query and latest-observation pairing; update outcome rendering to show both years, delta, and dates.
3. Add tests for initial chart selection and the focused parent/children view; implement in-place chart navigation, breadcrumbs, keyboard activation, and back behavior.
4. Remove the separate detail disclosure from the primary flow, refine responsive styling and motion, inspect desktop and mobile, run all checks, update the private staging Site.
