# Reverse adjustment reconciliation

The Sankey currently draws a dashed arrow from the General Fund back to a revenue category. A negative accounting entry is not a backward movement of money, so the arrow gives the wrong visual cue.

Show a compact reconciliation directly above the diagram whenever the selected scope has negative links. Name each negative entry, show its signed value and source category, and show how positive entries plus the signed adjustment equal the recorded total. For the current General Fund revenue adjustment, compare the signed amount with FY2024 when the matching entry exists. Use short text to explain that it reduces recorded revenue and does not represent a payment. Keep negative amounts in `buildSankey` and all totals; do not render them as positive ribbons.

The reconciliation stays visible before horizontal chart scrolling on phones. It uses text and a restrained color cue, not a path or animation. If the selected fund has no negative adjustment, omit the reconciliation. If a prior-year match is missing, omit only the comparison. Preserve exact values in accessible text and tooltips.

Verify signed reconciliation for the two-fund fixture and the real FY2025 snapshot, including FY2024 comparison. Verify no reverse SVG path remains, positive ribbon scaling and keyboard access remain, and check desktop and mobile rendering.
