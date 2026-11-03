# Reverse Adjustment Reconciliation Implementation Plan

> **For agentic workers:** Use the test-driven-development and verification-before-completion skills for this focused change.

**Goal:** Replace the misleading reverse arrow with a signed, prior-year-aware revenue reconciliation.

**Architecture:** `buildSankey` remains the accounting source. `renderSankey` derives the adjustment display from its signed links and an optional previous-year graph. The opening view passes its existing `previousData`; CSS places the reconciliation before the horizontally scrollable SVG.

**Tech Stack:** Static JavaScript modules, CSS, Node test runner.

## Global Constraints

- Keep all amounts signed and reconcile to the selected scope.
- Preserve the existing revenue and spending distinction.
- Keep the annotation readable at 390 px and accessible without color.

### Task 1: Reconciliation behavior

**Files:** `tests/sankey.test.mjs`, `public/sankey.mjs`, `public/view.mjs`

**Interfaces:** `renderSankey(data, group, fundCode, previousData = null)` returns the chart HTML.

- [x] Add a test that asserts positive revenue plus the signed adjustment equals recorded revenue in the rendered text, names the affected fund and category, includes the FY2024 signed value when supplied, and contains no `sankey-reverse` path.
- [x] Run `node --test tests/sankey.test.mjs` and confirm the new assertion fails.
- [x] Render the reconciliation from `graph.reverseLinks`, use `money()` for visible values and `exactMoney()` for accessible detail, and pass `previousData` from `render()`.
- [x] Run the focused tests and confirm they pass.

### Task 2: Responsive presentation and release

**Files:** `public/styles.css`

- [x] Style the reconciliation as a compact editorial row above the chart and stack its arithmetic on phones.
- [x] Run all JavaScript and Python tests, `git diff --check`, and inspect desktop and 390 px renders in isolated Edge.
- [ ] Commit and push the feature branch, then deploy it to the existing private staging Site.
