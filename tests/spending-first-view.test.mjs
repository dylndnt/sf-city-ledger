import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render } from '../public/view.mjs';

const current = JSON.parse(readFileSync(new URL('../public/data/fy2025.json', import.meta.url)));
const previous = JSON.parse(readFileSync(new URL('../public/data/fy2024.json', import.meta.url)));

test('the opening flow shows spending areas and prior-year context', () => {
  const html = render(current, 'All city funds', '', false, { path: [] }, previous);
  assert.match(html, /class="chart-stage"[^>]*><figure class="sankey-figure"/);
  assert.match(html, /SPENDING AREAS/);
  assert.equal((html.match(/<g data-node="use"/g) || []).length, 7);
  assert.match(html, /FY2024/);
  assert.doesNotMatch(html, /id="spending-drilldown"/);
});

test('first choice opens the spending explorer with its selected parent and departments', () => {
  const start = render(current, 'All city funds', '', false, { path: [] }, previous);
  const selected = render(current, 'All city funds', '', false, { path: ['02'] }, previous);
  assert.match(start, /data-spending-root="02"/);
  assert.match(selected, /id="spending-drilldown"/);
  assert.match(selected, /data-branch-code="02"/);
  assert.match(selected, /data-next-code="DPW"/);
});
