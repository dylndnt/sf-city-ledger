# Compact FY2025 fund Sankey design

Date: 2026-09-27

## Goal

The first screen of the published site should give a new visitor one clear picture: recorded revenue categories on the left, **city fund groups in the middle**, and recorded spending areas on the right. Keep FY2025 actuals and the existing weekly data refresh.

## Opening view

Replace the large hero and three expanded panels with a compact title, FY2025/as-of/source line, two independent citywide totals, and one wide Sankey diagram. The diagram has five revenue category nodes, four fund group nodes, and seven spending organization-group nodes. Each positive revenue-category-to-fund and fund-to-spending link uses the actual signed-net group amount from `public/data/fy2025.json`; width is proportional to dollars on one common scale.

The General Fund's `Financing, transfers and recoveries` link is negative (about $1.05B in the current snapshot). Draw it as a red reverse link outside the positive ribbon stack, with its signed value in visible text. Do not turn it into a positive ribbon. The fund node shows recorded revenue and spending as two separate figures; its left and right ports need not match. A short visible note says the two sides are independent accounting actuals, not a tracing of particular tax dollars into services or a cash ledger.

Keep the exact category and fund values accessible in text. A collapsed **Explore details** section contains the existing bar breakdown and individual-fund selector. The initial screen shows the whole city without requiring a click. The diagram itself is static in this first version; the existing details controls provide exploration.

## Layout and behavior

Render the diagram as an inline SVG from the current JSON at page load. Put source nodes, fund nodes, and spending nodes in three fixed columns with readable labels. Each positive link is a closed curved ribbon with a `<title>` naming its source, destination, and dollar value. The reverse adjustment is red with a visible signed label. SVG has an accessible title and description; the text details remain available for keyboard and screen-reader users.

On small screens, keep label size readable and allow horizontal panning of the diagram in a clearly labeled scroll region. Do not shrink the entire diagram until labels are illegible. Respect reduced-motion preferences; the chart needs no animation.

## Checks

Verify five source nodes, four fund nodes, seven spending nodes, and link sums against the existing snapshot. Verify all positive ribbons use the same dollars-to-pixels scale, the one negative group link is visible as a reverse adjustment, and the citywide totals still reconcile to $18,830,184,131.21 revenue and $18,176,493,730.33 spending for the current snapshot. Test the SVG markup and inspect the live page at desktop and narrow widths. The weekly refresh workflow and data format remain unchanged.
