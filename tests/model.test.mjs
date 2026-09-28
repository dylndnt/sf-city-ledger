import test from 'node:test';
import assert from 'node:assert/strict';
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
  assert.match(html, /class="bar negative"/);
  assert.doesNotMatch(html, /surplus|deficit/i);
});

test('source labels are escaped before insertion into the page', () => {
  const malicious = structuredClone(data);
  malicious.funds[0].fund = '<img src=x onerror=alert(1)>';
  const html = render(malicious, 'General Fund', 'GF~1');
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
});

test('citywide Sankey is the first view and detailed bars start collapsed', () => {
  const html = render(data);
  assert.ok(html.indexOf('class="sankey-figure"') > 0);
  assert.ok(html.indexOf('class="sankey-figure"') < html.indexOf('<details'));
  assert.match(html, /<summary>Explore details/);
  assert.doesNotMatch(html, /<details[^>]*open/);
  assert.match(html, /\$170/);
  assert.match(html, /\$120/);
  assert.match(html, /Data as of/);
});
