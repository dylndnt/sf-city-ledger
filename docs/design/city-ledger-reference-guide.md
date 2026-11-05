# City Ledger design reference guide

## Purpose and research

The first view is the original money flow chart. It shows revenue sources, city funds, and spending areas together. The visitor can select a spending area to follow it through departments, programs, cost classifications, named payees, and related department measures. Revenue, fund accounting, paid vouchers, and outcomes have different meanings and retain separate labels.

This guide applies findings from the published guidance and products below. The rules that follow are City Ledger decisions, not copies of those sites.

| Source | Finding | City Ledger decision |
| --- | --- | --- |
| [GOV.UK chart guidance](https://brand.design-system.service.gov.uk/data/charts/) | Use concise sentence-case titles, a subtitle with measure/place/time, direct labels, nearby annotations, and a specific source. | Name the measure and FY at the chart; put amounts beside categories; put source and data date next to the visualization. |
| [USWDS data visualizations](https://designsystem.digital.gov/components/data-visualizations/) | Limit a chart to a central idea, do not make hover necessary, and provide text for chart values. | The opening flow labels revenue, funds, and spending directly. Deep rows show their current value, share, and FY2024 comparison. |
| [GOV.UK dashboards](https://brand.design-system.service.gov.uk/data/dashboards/) | Complex material needs a clear hierarchy and concise exploration guidance. | The original money flow is the entry point; selecting a spending area reveals the classification explorer in its place. |
| [GOV.UK breadcrumbs](https://design-system.service.gov.uk/components/breadcrumbs/) and [USWDS side navigation](https://designsystem.digital.gov/components/side-navigation/) | Show location in a hierarchy and mark the current item without relying on color alone. | Keep the selected row in its ranked position, mark it with `aria-current`, a left rule and fill, and keep the path navigable. |
| [Carbon chart anatomy](https://www.carbondesignsystem.com/building-blocks/data-visualization/chart-anatomy) | Label data directly and use tooltips for extra precision. | Show compact values in rows and exact values in accessible labels or detail controls. |
| [NYC Databook procurement](https://databook.nyc/procurement) and [its source notes](https://databook.nyc/procurement/data-sources) | Keep committed and paid concepts distinct and explain provenance. | Keep recorded spending, paid vouchers, and outcome measures in distinct sections with explicit source links. |
| [Our World in Data's chart redesign](https://ourworldindata.org/redesigning-our-interactive-data-visualizations) | Make sources prominent and reserve a larger workspace for exploration. | Keep the source visible and let the classification explorer occupy the main frame. |

## Page hierarchy

1. A restrained masthead: `City Ledger` and `San Francisco`.
2. Page title: `San Francisco spending, FY2025`. Subtitle: `Explore revenue and city funds, then select a spending area to see the departments and costs behind it.`
3. A compact scope row: fund filter, data date, source link.
4. The opening money flow chart: revenue sources on the left, city funds in the middle, and seven spending areas on the right. Signed adjustments appear with the chart. A spending area or its ribbon opens the next view.
5. On selection, replace the flow chart in the same frame with the classification explorer. The chosen area stays visible in its ranked position while its departments appear. Continue through six levels. At the leaf show payees; department measures remain a related, separate section.
6. The `All spending` breadcrumb returns to the opening money flow chart.

## Copy and terminology

| UI label | Meaning |
| --- | --- |
| Recorded spending | Signed accounting actuals in the selected fiscal year and fund scope. |
| Spending area | Organization group. |
| Department | Agency that recorded the spending. |
| Program | Activity recorded within the department. |
| Cost type | Source character classification; for example salaries or services. |
| Cost category | Source object classification. |
| Detailed cost | Source sub-object classification. |
| Paid vendor vouchers | Separate payment records for the exact selected path. |
| Related department measures | Department-level observations, not program impact. |

Use `FY2025` and `FY2024` beside compared amounts. Use `Change` for signed arithmetic. Keep source codes visible in smaller text on deep rows. Put methodology and reporting caveats in the existing disclosures, not in persistent warning banners.

For related department measures, keep each title, observation date, and prior value on the left. Place the current value, signed absolute change, and percentage change together on the right, with the changes directly beneath the value. Limit the measure list to a readable column so titles and values remain close. A percentage measure uses percentage points for its absolute change and a relative percentage for its percentage change. If the prior value is zero or absent, say that percentage change is unavailable.

## Visual rules

Preserve the established palette. Background `#f7f5ef`; paper `#fffefa`; main ink `#153238`; selected teal `#173e43`; rust action/accent `#b56c55`; pale green amount fill `#e0eee3`; structural line `#cbd4ca`; muted text `#5b7169`. Rust is for clickable emphasis and negative adjustment, not a second background color. Color never carries selection alone.

Use one interface type family (`DM Sans`, Arial fallback). Use 34–40 px for the page title, 26–32 px for the selected category, 16 px for column headings, 14 px for row names and body text, 12 px for comparisons and source codes. Use tabular numerals for amounts. Reserve uppercase letterspacing for the small masthead only. Avoid decorative punctuation in the title.

The opening flow chart retains its existing ribbons and color mapping. In the explorer, columns are separated by space and a light vertical line. Rows use a bottom divider. Do not nest bordered cards or shadows. The selected row has a 3 px teal left rule, restrained teal tint, bold label, and `aria-current`. Siblings remain readable at lower emphasis. A thin proportional bar remains visible as a quantitative cue.

Use a square or 2 px radius on controls and disclosures. A border means an interactive control, a data row separator, or a section boundary. Avoid borders around every container. Links are underlined. Focus is a clear outline. The existing Sankey retains its source and fund colors, but stays secondary to the spending task.

## Motion and responsive behavior

The chart frame and header keep their position when the flow becomes the explorer. Existing rows keep their order and DOM where possible. A newly revealed column may fade in over at most 180 ms; layout movement remains brief and functional. Respect `prefers-reduced-motion`.

At 390 px, the flow chart is horizontally scrollable with a direct jump to spending areas. In the explorer, one next-level list fills the width; selected ancestor levels become horizontally scrollable context above it. The path stays one line high and can be scrolled to the active endpoint. No page-wide horizontal overflow. The prior-year line stays attached to its current amount.

## Acceptance review

- The original revenue → funds → spending chart opens the site, with seven clickable spending areas.
- The first click reveals the selected area and departments in the same chart frame. Each deeper click preserves rank and selected context.
- Fund scope changes update totals and comparisons together.
- Revenue and fund flow and its signed adjustment are available on the opening view.
- Desktop, 390 px mobile, keyboard navigation, reduced motion, payee and outcome states remain usable.
