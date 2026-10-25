# Persistent spending branch navigation

## Purpose

Keep the selected spending category visible while exploring its children, with enough surrounding context to switch branches without retracing the whole path.

## Interaction

- The opening Sankey remains the entry point. Choosing a spending area opens the branch view inside the same chart frame.
- The branch view shows up to three adjacent classification levels. Its left columns show the selected category and its siblings; the right column shows the next choices. The selected items use the dark accent, while siblings have a muted surface and remain readable, keyboard accessible, and clickable.
- Choosing a sibling replaces the path from that level onward. Choosing a child advances one level. The full breadcrumb stays above the columns, including levels that have scrolled out of the visible window.
- At the final sub-object, the final column presents payees. Choosing a payee reveals vouchers without losing the selected classification path.
- Each column has a short description of what that classification level means. Copy describes the level, not a claim about the purpose or impact of a particular line item.
- A 180–240 ms directional reveal on the entering column and subtle selection changes explain navigation. Reduced-motion preference removes movement.

## Related evidence

- Related outcome measures and paid vouchers stay available at the same depths and retain year comparisons.
- Longer caveats about attribution, reporting periods, and accounting bases move from permanent paragraphs into accessible disclosure tooltips beside their headings. Tooltips open by click, tap, or keyboard, remain readable while open, and close by the native disclosure behavior.
- Published metric definitions remain accessible per measure.

## Constraints and verification

- Continue using the existing static FY2025/FY2024 snapshots and live Scorecard/vendor endpoints. No new data source or invented category definitions.
- Preserve signed values, exact category codes, fund selection, source links, and existing data caveats.
- Verify branch switching at multiple depths, keyboard access, long labels, small screens, and reduced motion. Keep comparisons accurate when a prior value is missing.
