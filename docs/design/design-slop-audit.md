# Design Slop audit: City Ledger

Reference: [wpgaurav/design-slop](https://github.com/wpgaurav/design-slop), commit `762729ec0031c50260992cef8e7ed2562bb66f31` (MIT). Applied its evidence-based scan to the existing city spending explorer. This is a focused cleanup of the current visual language.

| Priority | Evidence | Cost to the visitor | Replacement | Check |
| --- | --- | --- | --- | --- |
| Major | `.zoom-chart` adds a border, radius, tint, and shadow around three `.branch-column` panels, which contain individually bordered `.branch-item` cards. | Repeated boxes make the spending path harder to read as one connected flow. | Use the page canvas for the drilldown, light dividers between columns, and one strong fill only for the selected row. | Desktop and phone paths retain clear grouping and selected state. |
| Moderate | The opening heading says “Where the money goes.” at up to 5rem. | The first screen spends space on a generic phrase before naming the city, year, and task. | Use a concrete San Francisco spending heading and a short sentence that names the drilldown. Reduce title scale so the chart starts sooner. | Chart remains the opening interaction at desktop and phone widths. |
| Moderate | `.branch-bar` has a colored left border in addition to its proportional fill. | The accent looks like a status signal but represents no extra data. | Keep the proportional fill and remove the accent edge. | Relative amount cue remains visible on unselected rows. |
| Minor | Hovered and selected branch cards have elevation shadows. | Floating cards imply a separate layer when the row only changes selection state. | Use border, fill, and text contrast for interaction feedback. | Hover, focus, and selected states remain distinct. |

The named government sources, actual figures, prior-year comparisons, outcome caveats, and payee records are real product content. They remain in place. Motion stays limited to showing how the classification columns change position.
