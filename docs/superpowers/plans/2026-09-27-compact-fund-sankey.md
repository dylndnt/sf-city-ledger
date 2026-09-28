# Compact Fund Sankey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a fund-centered Sankey the first view of the FY2025 actuals site.

**Architecture:** A pure JavaScript module derives positive revenue and spending links plus signed reverse adjustments from the committed JSON. A deterministic SVG renderer assigns one dollar scale to both sides. The page places this figure before a collapsed copy of the existing detailed view.

**Tech Stack:** Vanilla ES modules, SVG, CSS, Node 22 built-in tests.

## Global Constraints

- Keep the five source categories, four fund groups, and seven city spending groups.
- Keep funds in the middle; left and right totals remain separately recorded actuals.
- Draw the negative General Fund financing/transfer group as a red reverse adjustment, never as a positive ribbon.
- Preserve existing data JSON and weekly refresh code.
- Keep all labels and exact values available in text, with source and as-of date visible.

---

### Task 1: Derive signed fund links

**Files:** Create `public/sankey.mjs`; create `tests/sankey.test.mjs`.

**Interfaces:** `buildSankey(data)` returns ordered `{sources, funds, uses, revenueLinks, spendingLinks, reverseLinks, totals}`. Every link has integer `cents`, `source`, and `target`. Positive links have positive cents; reverse links retain negative cents.

- [ ] **Step 1:** Write `tests/sankey.test.mjs` with a two-fund fixture. Assert source/fund/use counts, separate totals, and that a negative General Fund revenue group appears only in `reverseLinks`.
- [ ] **Step 2:** Run `node --test tests/sankey.test.mjs`; confirm missing-module failure.
- [ ] **Step 3:** Implement `buildSankey` by summing `revenueGroups` and `spendingGroups` for each `fundGroup` in the existing `fundOrder`, and mapping organization-group codes to labels. Partition revenue links by sign. Sum each side independently in integer cents.
- [ ] **Step 4:** Run the new and existing Node tests; confirm all pass.

### Task 2: Render proportional SVG ribbons

**Files:** Modify `public/sankey.mjs`; extend `tests/sankey.test.mjs`.

**Interfaces:** `renderSankey(data)` returns SVG figure markup. Each positive ribbon has a `data-cents` attribute and uses the same computed `pixelsPerCent` value. Reverse adjustment markup has `data-reverse` and a signed visible label.

- [ ] **Step 1:** Add failing assertions for a single SVG, accessible title/description, five/ four/seven node headings for the real snapshot, and negative reverse-link markup. Check generated path thickness from two known fixture links has the same amount ratio.
- [ ] **Step 2:** Run the tests and confirm the new assertions fail.
- [ ] **Step 3:** Implement node layout: fixed source/fund/use columns, node heights equal to the larger of minimum label height or flow height, vertical spacing, and link offsets within each node. Render cubic closed ribbons with one common scale and escaped labels. Put the reverse adjustment in its own lower lane with a signed annotation.
- [ ] **Step 4:** Run tests; inspect real-data output for counts and reconciliation.

### Task 3: Simplify the opening page and publish

**Files:** Modify `public/view.mjs`, `public/styles.css`, `tests/model.test.mjs`, `README.md`.

- [ ] **Step 1:** Add a failing page test asserting the Sankey figure precedes a collapsed `Explore details` section and that the citywide actual totals/as-of date remain visible.
- [ ] **Step 2:** Run `node --test tests/model.test.mjs` to confirm failure.
- [ ] **Step 3:** Replace the hero/expanded panels in `render` with compact heading, two totals, `renderSankey(data)`, the accounting note, and a `<details>` wrapper around existing interactive breakdowns. Retain the current selection/event logic inside details.
- [ ] **Step 4:** Add desktop and narrow-screen CSS. SVG region scrolls horizontally on narrow screens; labels retain useful size. Update README's opening-view description.
- [ ] **Step 5:** Run Python and Node tests plus `git diff --check`. Preview locally and inspect the published result after pushing. Commit in the feature worktree, fast-forward `main`, push, and verify the GitHub Actions deployment and public URL.
