# City Ledger visual system

## Reference and intent

The [ElevenLabs homepage](https://elevenlabs.io/) is the main layout reference. Its current opening uses a concise headline, a separate explanation, generous white space, and one prominent interactive demonstration. The [official brand guide](https://elevenlabs.io/brand) describes a restrained monochrome approach for ElevenAPI and distinct color systems for other products. A [2026 homepage capture](https://leos.vn/elevenlabs-la-gi-danh-gia-chi-tiet-cong-cu-tao-giong-noi-ai-so-1-2026/) shows the split introduction, filled controls, and a soft demonstration surface. These are observations; the rules below are our adaptation for public finance data.

The ledger keeps its existing teal, rust, and warm neutral palette. The money flow chart remains the opening interaction. The reference informs the composition and restraint, not the use of ElevenLabs logos, orbs, gradients, or product imagery.

## Page composition

1. Use a small, quiet masthead with the project name and place. Let spacing, not a box, separate it from the page.
2. Split the introduction on wide screens: the title occupies the left, while the one-sentence instruction, data date, and source sit in a narrower right column. Stack these in reading order on mobile.
3. Put the fund selector and help disclosure in a compact control row with no enclosing rule.
4. Place the revenue → funds → spending diagram on one low-contrast surface. This is the sole large panel on the opening view. Its ribbons, fund blocks, and labels carry the data color.
5. When a spending area is chosen, keep the page header and chart position stable. Replace the diagram with the classification explorer. The selected area retains its original position and the next level appears beside it.
6. Keep payees and related department measures within the same reading flow, without a second stack of outlined cards.

## Tokens

| Role | Value | Use |
| --- | --- | --- |
| Page | `#f7f5ef` | Warm canvas. |
| Chart surface | `#f0f1ec` | One soft area around the opening diagram. |
| Primary ink | `#153238` | Titles, values, and data labels. |
| Deep teal | `#173e43` | Fund nodes, selected text, and filled emphasis. |
| Rust | `#b56c55` | Signed negative entries and links. |
| Selected fill | `#e5eee6` | Active hierarchy row. |
| Muted ink | `#5b7169` | Dates, source notes, and supporting text. |
| Hairline | `#dbe3da` | Row division only. |

Use DM Sans throughout, with tabular numerals for amounts. The page title uses 32–58 px depending on viewport; selected category titles use 28–40 px; column titles and primary row names use 14–16 px; comparison and provenance text use 11–12 px. Avoid all-caps text except the masthead and compact chart column labels. The spacing scale is 4, 8, 12, 20, 32, 48, and 64 px.

## Surfaces, borders, and controls

An outer border, shadow, or repeated outlined card must not define the chart, adjustment, hierarchy column, or measure list. Use whitespace and one tonal surface to establish hierarchy. A hairline may separate adjacent data rows, never surround each row. Avoid decorative gradients and icon badges.

The fund selector uses a filled neutral surface with no resting border. The current breadcrumb is bold text rather than a filled chip. The selected hierarchy row uses the pale teal fill and stronger text; siblings remain legible. Hover adds only a small tonal shift. Links remain underlined. Keyboard focus has a visible outline even though resting controls do not.

The signed adjustment is a compact reading strip below the diagram, inside the chart surface. Show positive amount, signed adjustment, and recorded amount as a simple equation, with the signed value in rust. Keep the prior-year comparison adjacent. Do not make a separate bordered accounting card.

## Motion and mobile

Motion serves navigation only: a newly revealed column may fade in within 180 ms. Rows do not reorder or lift on hover. `prefers-reduced-motion` removes the reveal. At 390 px the introduction stacks, the diagram scrolls inside its surface with a direct jump to spending, and the page itself has no horizontal overflow. In the drilldown, selected ancestors remain scrollable context above a full-width next level.

## Acceptance

- The opening chart has no visible rectangular outline or card shadow.
- The page has one clear visual starting point: the money flow.
- Selected and unselected spending areas are distinguishable without relying only on color.
- The adjustment, payee, and outcome sections read as part of the page instead of nested boxes.
- Desktop and 390 px mobile preserve the spending path, source links, prior-year values, keyboard focus, and reduced-motion behavior.
