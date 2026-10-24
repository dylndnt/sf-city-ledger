# Spending Drilldown and Outcomes Implementation Plan

**Goal:** Add an auditable path from city spending categories to departments, programs, detailed spending types, named vendor payees, and related department outcome measures.

**Architecture:** Extend the validated static accounting snapshot with granular spending rows. Group them in a small browser model and render a navigable drilldown under the existing overview. Query DataSF vendor and scorecard datasets only for the selected branch, with separate source dates and labels.

**Tech Stack:** Python 3.13, browser JavaScript modules, Node test runner, DataSF Socrata API.

**Spec:** `docs/superpowers/specs/2026-10-23-spending-drilldown-outcomes-design.md`

## Tasks

1. Add a failing Python test for spending hierarchy records, related-unit exclusion, and total reconciliation. Extend `scripts/build_data.py`, then rebuild `public/data/fy2025.json` and run Python tests.
2. Add failing Node tests for scoped hierarchy aggregation, selected-path totals, and API query construction. Implement `public/drilldown.mjs` and run Node tests.
3. Add failing view tests for clickable rows, breadcrumb navigation, signed totals, source escaping, and related-data empty states. Implement the drilldown rendering and event handling in `public/view.mjs`, `public/app.mjs`, and `public/styles.css`.
4. Add the DataSF vendor and scorecard fetch paths. Keep distinct loading/error states and show source dates. Test query generation and rendering, then run the complete test suite and inspect the page locally.
5. Update `README.md` and `DATA_NOTES.md` with source semantics, limits, and refresh behavior. Review the diff and commit the feature branch.
