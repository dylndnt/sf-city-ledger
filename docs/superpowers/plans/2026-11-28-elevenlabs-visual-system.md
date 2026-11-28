# ElevenLabs-inspired ledger visual pass

1. Record the reference observations and City Ledger decisions in `docs/design/elevenlabs-inspired-ledger.md`. Keep the finance palette and original money flow.
2. Restructure the introduction in `public/view.mjs` into title and context columns. Update the loaded visual stylesheet with a consistent type, spacing, surface, and control system.
3. Remove borders and shadows from the chart and adjustment. Keep node shapes and ribbons because they encode data. Use the same surface logic for drilldown rows, payees, and outcomes.
4. Check the initial chart, first and deep selections, fund switching, desktop/mobile widths, keyboard focus, and reduced motion. Run the existing test suites and deploy the resulting static source to the private staging site.
