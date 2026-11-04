import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render } from '../public/view.mjs';

const current = JSON.parse(readFileSync(new URL('../public/data/fy2025.json', import.meta.url)));
const previous = JSON.parse(readFileSync(new URL('../public/data/fy2024.json', import.meta.url)));

test('the opening chart starts with seven spending areas and prior-year context', () => {
  const html = render(current, 'All city funds', '', false, { path: [] }, previous);
  const chart = html.slice(html.indexOf('class="chart-stage"'), html.indexOf('</section>\n    <footer>'));
  assert.match(chart, /id="spending-drilldown"/);
  assert.match(chart, /Spending areas/);
  assert.equal((chart.match(/data-next-code=/g) || []).length, 7);
  assert.match(chart, /FY2024/);
  assert.match(html, /<summary>Revenue and fund context<\/summary>/);
  assert.ok(html.indexOf('id="spending-drilldown"') < html.indexOf('class="sankey-figure"'));
});

test('first choice keeps the spending chart and first column identity', () => {
  const start = render(current, 'All city funds', '', false, { path: [] }, previous);
  const selected = render(current, 'All city funds', '', false, { path: ['02'] }, previous);
  const key = start.match(/data-branch-level="0" data-branch-key="([^"]+)"/)?.[1];
  assert.ok(key);
  assert.match(selected, /id="spending-drilldown"/);
  assert.ok(selected.includes(`data-branch-level="0" data-branch-key="${key}"`));
  assert.match(selected, /data-next-code="DPW"/);
});
