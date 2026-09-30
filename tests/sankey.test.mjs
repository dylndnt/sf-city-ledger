import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSankey, layoutSankey, renderSankey } from '../public/sankey.mjs';

const fixture = {
  fiscalYear: '2025', dataAsOf: '2026-09-20T23:05:20.000',
  organizationGroups: { '01': 'Public Protection', '04': 'Community Health' },
  funds: [
    { fundGroup: 'General Fund', fundCode: 'GF~1', fund: 'General Fund',
      revenueGroups: { Taxes: 10000, 'Financing, transfers and recoveries': -2000 },
      spendingGroups: { '01': 5000 } },
    { fundGroup: 'Enterprise Funds', fundCode: 'ENT~1', fund: 'Transit',
      revenueGroups: { 'Charges for services': 9000 }, spendingGroups: { '04': 7000 } },
  ],
};

test('funds are the middle layer and signed adjustments stay negative', () => {
  const graph = buildSankey(fixture);
  assert.deepEqual(graph.sources.map(n => n.label), ['Taxes', 'Charges for services', 'Financing, transfers and recoveries']);
  assert.deepEqual(graph.funds.map(n => n.label), ['General Fund', 'Enterprise Funds']);
  assert.deepEqual(graph.uses.map(n => n.label), ['Community Health', 'Public Protection']);
  assert.equal(graph.revenueLinks.length, 2);
  assert.equal(graph.spendingLinks.length, 2);
  assert.deepEqual(graph.reverseLinks.map(l => [l.side, l.source, l.target, l.cents]),
    [['revenue', 'General Fund', 'Financing, transfers and recoveries', -2000]]);
  assert.equal(graph.totals.revenue, 17000);
  assert.equal(graph.totals.spending, 12000);
  assert.equal(graph.revenueLinks.reduce((n, l) => n + l.cents, 0)
    + graph.reverseLinks.reduce((n, l) => n + l.cents, 0), graph.totals.revenue);
});

test('every positive ribbon uses one dollars-to-pixels scale', () => {
  const layout = layoutSankey(buildSankey(fixture));
  const tax = layout.revenueLinks.find(l => l.source === 'Taxes');
  const charge = layout.revenueLinks.find(l => l.source === 'Charges for services');
  assert.equal(tax.thickness / charge.thickness, tax.cents / charge.cents);
  assert.ok(layout.funds.every(node => node.x > layout.sources[0].x));
  assert.ok(layout.uses.every(node => node.x > layout.funds[0].x));
});

test('layout still fits when one spending area dominates', () => {
  const uneven = structuredClone(fixture);
  uneven.organizationGroups = Object.fromEntries(
    ['01', '02', '03', '04', '05', '06', '07'].map(code => [code, `Area ${code}`]));
  uneven.funds[0].spendingGroups = {
    '01': 90000, '02': 100, '03': 100, '04': 100,
    '05': 100, '06': 100, '07': 100,
  };
  const layout = layoutSankey(buildSankey(uneven));
  assert.ok(Math.max(...layout.uses.map(node => node.y + node.height)) <= 580);
});

test('every flow exposes an exact amount for hover and keyboard focus', () => {
  const html = renderSankey(fixture);
  const paths = [...html.matchAll(/<path[^>]*class="sankey-(?:ribbon|reverse)"[^>]*>/g)]
    .map(match => match[0]);
  assert.equal(paths.length, 5);
  for (const path of paths) {
    assert.match(path, /data-flow=/);
    assert.match(path, /data-amount=/);
    assert.match(path, /data-route=/);
    assert.match(path, /tabindex="0"/);
  }
  assert.match(html, /data-amount="\$100\.00"/);
  assert.match(html, /data-amount="−\$20\.00"/);
  assert.match(html, /class="flow-tooltip"[^>]*hidden/);
});

test('real FY2025 snapshot renders all nodes and one visible reverse adjustment', () => {
  const data = JSON.parse(readFileSync(new URL('../public/data/fy2025.json', import.meta.url)));
  const graph = buildSankey(data);
  assert.equal(graph.sources.length, 5);
  assert.equal(graph.funds.length, 4);
  assert.equal(graph.uses.length, 7);
  const sumFundValues = key => data.funds.reduce((total, fund) =>
    total + Object.values(fund[key]).reduce((sum, cents) => sum + cents, 0), 0);
  assert.equal(graph.totals.revenue, sumFundValues('revenueGroups'));
  assert.equal(graph.totals.spending, sumFundValues('spendingGroups'));
  assert.equal(graph.reverseLinks.length, 1);
  assert.equal(graph.revenueLinks.reduce((n, link) => n + link.cents, 0)
    + graph.reverseLinks.filter(link => link.side === 'revenue').reduce((n, link) => n + link.cents, 0),
  graph.totals.revenue);
  assert.equal(graph.spendingLinks.reduce((n, link) => n + link.cents, 0)
    + graph.reverseLinks.filter(link => link.side === 'spending').reduce((n, link) => n + link.cents, 0),
  graph.totals.spending);
  const html = renderSankey(data);
  assert.match(html, /<svg[^>]*role="img"/);
  assert.match(html, /<title[^>]*>FY2025 fund Sankey/);
  assert.match(html, /data-reverse="true"/);
  assert.match(html, /−\$1\.05B/);
  assert.match(html, /Public Works, Transportation/);
});
