# City Ledger implementation plan

**2026-11-03 revision:** Restore the original revenue → funds → spending chart as the opening view. Selecting a spending area opens the redesigned classification explorer in the same chart frame. The `All spending` breadcrumb returns to the opening chart. The tasks below record the preceding design pass.

**Goal:** Make the spending hierarchy the opening chart and apply one coherent design system from labels through interaction states.

**Architecture:** Keep `compareSpending` and the existing branch columns as the classification model. Render the drilldown at path `[]` so the same chart DOM serves the opening and deeper states. Keep `renderSankey` in a closed accounting-context disclosure. Use a focused stylesheet with the existing palette and typography/border rules from the reference guide.

**Tech stack:** Static HTML, CSS, JavaScript modules; Node test runner; Python data tests; isolated Edge browser QA; private Sites staging.

## Task 1 — Spending chart as the entry point

**Files:** `tests/view.test.mjs`, `tests/drilldown-view.test.mjs`, `public/view.mjs`, `public/drilldown-view.mjs`, `public/app.mjs`.

1. Add tests for seven labeled opening spending rows, FY2024 comparison, a closed revenue/fund disclosure, and a stable `#spending-drilldown` frame before and after the first choice.
2. Run the focused tests to confirm the new behavior fails.
3. Render `renderDrilldown` for every path, including `[]`; place `renderSankey` in the closed secondary disclosure; keep the source and fund controls in the compact header.
4. Update the first-choice navigation to keep the chart in place. Preserve current focus, row order, column reuse, and scope behavior.
5. Run focused tests and correct any failures.

## Task 2 — Reference guide visual rules

**Files:** `public/styles.css`, `public/index.html`, `public/view.mjs`, `public/drilldown-view.mjs`, `public/drilldown.mjs`.

1. Apply the copy table from `docs/design/city-ledger-reference-guide.md`.
2. Use the established palette with the guide's type scale, spacing, border semantics, selected state, and compact title/scope row.
3. Make the opening rows read as a ranked proportion chart. Keep existing selected/muted semantics for deeper levels and use only light functional motion.
4. Verify visible and accessible labels at each depth, including paid vouchers and outcomes.

## Task 3 — Verification and staging

**Files:** tests and the existing private staging checkout.

1. Run all Node and Python tests and `git diff --check`.
2. Inspect opening, first click, deep path, payee/outcome, and fund-filter states at desktop and 390 px in an isolated browser; check no page overflow and reduced-motion behavior.
3. Commit and push the feature branch. Copy the changed static assets into the existing private staging source, package, and deploy. Keep the new branch separate from `main` until the staging result has been seen.
