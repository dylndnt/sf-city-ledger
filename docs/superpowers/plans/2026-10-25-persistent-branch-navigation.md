# Persistent Branch Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve category context through each spending drilldown and make supporting descriptions available without crowding the chart.

**Architecture:** Reuse `compareSpending` for each visible path prefix, producing at most three columns. Ancestor columns include all siblings and mark the selected code. The last column contains children, or vendors at the leaf. Event delegation updates the path at a chosen depth. CSS handles restrained transitions and responsive layout.

**Tech Stack:** Vanilla JavaScript modules, CSS, Node test runner, Python unittest.

## Global Constraints

- Keep the opening Sankey, existing data sources, selected fund scope, signed totals, and prior-year comparisons.
- Do not invent category-specific definitions.
- Honor `prefers-reduced-motion` and keyboard/touch access.

---

### Task 1: Persistent hierarchy

**Files:** `public/drilldown-view.mjs`, `public/app.mjs`, `tests/drilldown-view.test.mjs`

**Interfaces:** `renderDrilldown(data, group, fundCode, state, previousData)` returns the existing HTML section with branch columns. A branch button has `data-branch-depth` (zero-based level) and `data-branch-code`. The delegated click handler chooses `path.slice(0, depth).concat(code)`.

- [ ] Add a render test for path `['02','DPW']` checking selected ancestor rows, muted siblings, a child column, and the branch depth/code button attributes.
- [ ] Run `node --test tests/drilldown-view.test.mjs` and confirm the new assertion fails because the branch view is absent.
- [ ] Render each visible prefix with `compareSpending`; show two ancestor columns and one child column, or two ancestors and payees at the final level. Add selected and muted classes. Keep current totals, breadcrumbs, and year comparisons.
- [ ] Add the delegated branch click handler in `public/app.mjs`, choosing the new truncated path.
- [ ] Run `node --test tests/drilldown-view.test.mjs` and confirm the branch test passes.

### Task 2: Descriptions, tooltips, and motion

**Files:** `public/drilldown-view.mjs`, `public/styles.css`, `tests/drilldown-view.test.mjs`

**Interfaces:** Each level heading carries its short explanatory text. `infoTip(label, content)` returns a native details/summary disclosure adjacent to a related-card heading.

- [ ] Add tests confirming level descriptions and native disclosure markup, and confirm the old permanent caveat paragraphs are gone.
- [ ] Run `node --test tests/drilldown-view.test.mjs` and confirm the new assertions fail for the missing descriptions and tooltips.
- [ ] Add level descriptions and disclosure tooltips; keep actual metric definitions in their existing details controls.
- [ ] Style selected, muted, and entering columns; add small-screen horizontal column navigation and a reduced-motion override.
- [ ] Run `node --test tests/*.test.mjs` and `python -m unittest discover -s tests -q`.

### Task 3: Browser inspection and staging

**Files:** `README.md`, `docs/superpowers/specs/2026-10-25-persistent-branch-navigation-design.md`

- [ ] Inspect the chart at desktop and mobile widths. Open a spending area, switch an ancestor sibling, continue to a sub-object, inspect payees and outcome tooltips, and verify reduced motion.
- [ ] Update README interaction description, run `git diff --check`, and commit the feature.
- [ ] Deploy a private staging preview and provide its link for review. Do not merge to `main` until the user reviews staging.
