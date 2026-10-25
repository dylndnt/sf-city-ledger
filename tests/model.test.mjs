import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selectScope } from '../public/model.mjs';
import { render } from '../public/view.mjs';

const data = {
  fiscalYear: '2025', dataAsOf: '2026-09-20T23:05:20.000',
  sourceUrl: 'https://data.sf.gov/d/bpnb-jwfb',
  organizationGroups: { '01': 'Public Protection', '04': 'Community Health' },
  funds: [
    { fundGroup: 'General Fund', fundCode: 'GF~1', fund: 'General Fund',
      revenueGroups: { Taxes: 10000, 'Financing, transfers and recoveries': -2000 },
      spendingGroups: { '01': 5000 } },
    { fundGroup: 'Enterprise Funds', fundCode: 'ENT~1', fund: 'Transit',
      revenueGroups: { 'Charges for services': 9000 }, spendingGroups: { '04': 7000 } },
  ],
};

test('one selection filters both revenue and spending', () => {
  const city = selectScope(data, 'All city funds', '');
  assert.equal(city.revenueTotal, 17000);
  assert.equal(city.spendingTotal, 12000);
  const general = selectScope(data, 'General Fund', '');
  assert.equal(general.revenueTotal, 8000);
  assert.equal(general.spendingTotal, 5000);
  assert.equal(general.revenue['Financing, transfers and recoveries'], -2000);
  assert.equal(selectScope(data, 'General Fund', 'GF~1').funds.length, 1);
  assert.throws(() => selectScope(data, 'General Fund', 'ENT~1'), /outside selected group/);
});

test('markup names the selected fund and preserves negative signs', () => {
  const html = render(data, 'General Fund', 'GF~1');
  assert.match(html, /General Fund/);
  assert.match(html, /-\$20/);
  assert.match(html, /Public Protection/);
  assert.match(html, /Data as of/);
  assert.match(html, /reverse adjustment/);
  assert.doesNotMatch(html, /surplus|deficit/i);
});

test('source labels are escaped before insertion into the page', () => {
  const malicious = structuredClone(data);
  malicious.funds[0].fund = '<img src=x onerror=alert(1)>';
  const html = render(malicious, 'General Fund', 'GF~1');
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
});

test('citywide Sankey is the only opening chart', () => {
  const html = render(data);
  assert.ok(html.indexOf('class="sankey-figure"') > 0);
  assert.doesNotMatch(html, /<summary>Explore details/);
  assert.match(html, /\$170/);
  assert.match(html, /\$120/);
  assert.match(html, /Data as of/);
});

test('accounting context is available from a compact chart disclosure', () => {
  const html = render(data);
  assert.match(html, /<details class="chart-help"/);
  assert.match(html, /data-info-key="chart"/);
  assert.match(html, /About this chart/);
  assert.doesNotMatch(html, /class="scope-note"/);
});

test('the opening chart is the entry point and selection zooms in place', () => {
  const snapshot = JSON.parse(readFileSync(new URL('../public/data/fy2025.json', import.meta.url)));
  const opening = render(snapshot, 'All city funds', '', false, { path: [] });
  const focused = render(snapshot, 'All city funds', '', false, { path: ['02'] });
  assert.match(opening, /data-spending-root="02"/);
  assert.doesNotMatch(opening, /id="details-panel"/);
  assert.match(focused, /id="spending-drilldown"/);
  assert.doesNotMatch(focused, /class="sankey-figure"/);
});
