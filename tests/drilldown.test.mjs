import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { drilldown, vendorUrl, vendorDetailUrl, outcomeUrl, latestOutcomes } from '../public/drilldown.mjs';

const data = JSON.parse(readFileSync(new URL('../public/data/fy2025.json', import.meta.url)));

test('each spending level reconciles to its selected parent and fund', () => {
  const root = drilldown(data, 'All city funds', '', []);
  const fundTotal = data.funds.reduce((sum, fund) => sum
    + Object.values(fund.spendingGroups).reduce((part, amount) => part + amount, 0), 0);
  assert.equal(root.total, fundTotal);
  assert.equal(root.entries.reduce((sum, entry) => sum + entry.amount, 0), root.total);
  const group = root.entries.find(entry => entry.code === '02');
  const departments = drilldown(data, 'All city funds', '', ['02']);
  assert.equal(departments.total, group.amount);
  assert.equal(departments.entries.reduce((sum, entry) => sum + entry.amount, 0), group.amount);
  const fund = data.funds.find(item => item.fundGroup === 'General Fund' && item.spendingGroups['02']);
  const scoped = drilldown(data, 'General Fund', fund.fundCode, ['02']);
  assert.equal(scoped.total, fund.spendingGroups['02']);
});

test('vendor query follows the exact path and selected fund', () => {
  const path = ['02', 'DPW', 'OPR', 'NON_PERS_SVCS', 'CONTRCT_SVCS', '123'];
  const query = new URL(vendorUrl('2025', path, 'GEN_FUND~10000', 50)).searchParams.get('$query');
  assert.match(query, /department_code='DPW'/);
  assert.match(query, /sub_object_code='123'/);
  assert.match(query, /fund_code='GEN_FUND~10000'/);
  assert.match(query, /GROUP BY vendor/);
  assert.match(query, /vouchers_paid IS NOT NULL/);
  assert.match(query, /LIMIT 51 OFFSET 50/);
});

test('vendor and voucher queries keep the selected fund type codes', () => {
  const path = ['02', 'DPW', 'OPR', 'NON_PERS_SVCS', 'CONTRCT_SVCS', '123'];
  const vendors = new URL(vendorUrl('2025', path, '', 0, ['GEN_FUND'])).searchParams.get('$query');
  const vouchers = new URL(vendorDetailUrl('2025', path, 'ACME', '', 0,
    ['DEBT_SRVC', 'CPTL_PRJ', 'INTRL_SRVC', 'PERMA_FUND'])).searchParams.get('$query');
  assert.match(vendors, /fund_type_code='GEN_FUND'/);
  assert.match(vouchers, /fund_type_code IN\('DEBT_SRVC','CPTL_PRJ','INTRL_SRVC','PERMA_FUND'\)/);
});

test('outcome query is limited to observed FY2025 values for an explicit department', () => {
  const query = new URL(outcomeUrl('2025', 'DPW')).searchParams.get('$query');
  assert.match(query, /department='Public Works'/);
  assert.match(query, /actual IS NOT NULL/);
  assert.match(query, /actual != -9999/);
  assert.match(query, /2024-07-01/);
  assert.match(query, /2025-06-30/);
  assert.equal(outcomeUrl('2025', 'AIR'), null);
});

test('selected payee query reaches individual vouchers within the exact path', () => {
  const path = ['02', 'DPW', 'CAP', 'NON_PERS_SVCS', 'PROF_SPEC_SVC', '527040'];
  const query = new URL(vendorDetailUrl('2025', path, "O'BRIEN CO", '', 0)).searchParams.get('$query');
  assert.match(query, /vendor='O''BRIEN CO'/);
  assert.match(query, /sub_object_code='527040'/);
  assert.match(query, /SELECT voucher, purchase_order, contract_number, contract_title, vouchers_paid, data_as_of/);
  assert.match(query, /vouchers_paid IS NOT NULL/);
  assert.match(query, /LIMIT 51 OFFSET 0/);
});

test('outcome list keeps the latest observed value for each measure', () => {
  const rows = [
    { measure_code: '7', calendar_month: '2025-03-31', actual: '0.4' },
    { measure_code: '7', calendar_month: '2025-06-30', actual: '0.5' },
    { measure_code: '8', calendar_month: '2025-05-31', actual: '12' },
    { measure_code: '9', calendar_month: '2025-05-31', actual: '-9999' },
  ];
  assert.deepEqual(latestOutcomes(rows).map(row => row.actual), ['0.5', '12']);
});
