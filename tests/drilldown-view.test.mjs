import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderDrilldown } from '../public/drilldown-view.mjs';

const data = JSON.parse(readFileSync(new URL('../public/data/fy2025.json', import.meta.url)));
const previous = JSON.parse(readFileSync(new URL('../public/data/fy2024.json', import.meta.url)));

test('drilldown presents clickable next level and signed total', () => {
  const html = renderDrilldown(data, 'All city funds', '', { path: ['02'] });
  assert.match(html, /Department/);
  assert.match(html, /data-next-code="DPW"/);
  assert.match(html, /data-depth="0"/);
  assert.match(html, /Recorded spending in this path/);
  assert.match(html, /id="drill-heading" tabindex="-1"/);
});

test('vendor and outcome results remain distinct and escape source labels', () => {
  const path = ['02', 'DPW', 'OPR', 'NON_PERS_SVCS', 'CONTRCT_SVCS', '123'];
  const html = renderDrilldown(data, 'All city funds', '', {
    path, vendorStatus: 'ready', vendors: [{ vendor: '<script>alert(1)</script>', paid: '120.50', as_of: '2026-10-16' }],
    outcomeStatus: 'ready', outcomes: [{ measure_code: '1', measure_title: '<img src=x>', actual: '0.85', target: '0.9', measure_data_type: 'Percent', calendar_month: '2025-06-30' }],
  });
  assert.match(html, /Paid vendor vouchers/);
  assert.match(html, /Related department outcomes/);
  assert.match(html, /85%/);
  assert.doesNotMatch(html, /<script|<img/);
  assert.match(html, /&lt;script/);
});

test('selected payee opens individual public vouchers', () => {
  const path = ['02', 'DPW', 'CAP', 'NON_PERS_SVCS', 'PROF_SPEC_SVC', '527040'];
  const html = renderDrilldown(data, 'All city funds', '', {
    path, vendorStatus: 'ready', vendors: [{ vendor: 'ACME & CO', paid: '120.50' }],
    selectedVendor: 'ACME & CO', voucherStatus: 'ready',
    vouchers: [{ voucher: 'V-123', contract_title: 'Street work', vouchers_paid: '100.50', data_as_of: '2025-06-30' }],
  });
  assert.match(html, /data-vendor="ACME &amp; CO"/);
  assert.match(html, /V-123/);
  assert.match(html, /Street work/);
  assert.match(html, /Source date 2025-06-30/);
});

test('selected payee shows paid-voucher prior-year change', () => {
  const path = ['02', 'DPW', 'CAP', 'NON_PERS_SVCS', 'PROF_SPEC_SVC', '527040'];
  const html = renderDrilldown(data, 'All city funds', '', {
    path, selectedVendor: 'ACME', selectedVendorPaid: '150.00',
    priorVendorStatus: 'ready', previousVendorPaid: '100.00',
  });
  assert.match(html, /FY2024 paid vouchers/);
  assert.match(html, /\+\$50\.00/);
});

test('focused chart keeps its parent beside clickable children and a prior-year total', () => {
  const html = renderDrilldown(data, 'All city funds', '', { path: ['02'] }, previous);
  assert.match(html, /class="zoom-chart/);
  assert.match(html, /data-next-code="DPW"/);
  assert.match(html, /FY2024/);
  assert.match(html, /data-depth="-1"/);
  assert.match(html, /class="branch-compare"/);
});

test('outcome cards show prior observation and signed change', () => {
  const html = renderDrilldown(data, 'All city funds', '', {
    path: ['02', 'DPW'], outcomeStatus: 'ready', outcomes: [{
      measure_code: 'A', measure_title: 'Street repairs', actual: '15',
      calendar_month: '2025-06-30', measure_data_type: 'Number',
      previous: { actual: '12', calendar_month: '2024-06-30' },
    }],
  }, previous);
  assert.match(html, /FY2025/);
  assert.match(html, /FY2024/);
  assert.match(html, /\+3/);
  assert.match(html, /2024-06-30/);
});

test('selected path stays visible beside muted siblings and next choices', () => {
  const html = renderDrilldown(data, 'All city funds', '', { path: ['02', 'DPW'] }, previous);
  assert.match(html, /data-branch-level="0"/);
  assert.match(html, /data-branch-level="1"/);
  assert.match(html, /data-branch-level="2"/);
  assert.match(html, /data-branch-depth="0" data-branch-code="02"[^>]*aria-current="step"/);
  assert.match(html, /class="branch-item is-muted"/);
  assert.match(html, /data-branch-depth="1" data-branch-code="DPW"[^>]*aria-current="step"/);
  assert.match(html, /data-focus-key="1:DPW"/);
  assert.match(html, /data-next-code="CAP"/);
  assert.doesNotMatch(html, /class="branch-item[^\"]*"[^>]*aria-label=/);
});

test('selecting a department keeps the original sibling order', () => {
  const html = renderDrilldown(data, 'All city funds', '', { path: ['02', 'DPW'] }, previous);
  const department = html.slice(html.indexOf('data-branch-level="1"'));
  assert.ok(department.indexOf('data-branch-code="PUC"') < department.indexOf('data-branch-code="DPW"'));
  assert.match(department, /data-branch-key=/);
});

test('each visible level explains its classification and caveats use disclosures', () => {
  const html = renderDrilldown(data, 'All city funds', '', { path: ['02', 'DPW'] }, previous);
  assert.match(html, /Citywide grouping of departments/);
  assert.match(html, /Agency that recorded the spending/);
  assert.match(html, /Activity recorded within the department/);
  assert.match(html, /<details class="info-tip"/);
  assert.match(html, /data-info-key="related department outcomes"/);
  assert.doesNotMatch(html, /<p>These measures describe the department/);
});

test('leaf keeps selected classifications beside named payees', () => {
  const path = ['02', 'DPW', 'CAP', 'NON_PERS_SVCS', 'PROF_SPEC_SVC', '527040'];
  const html = renderDrilldown(data, 'All city funds', '', {
    path, vendorStatus: 'ready', vendors: [{ vendor: 'ACME', paid: '120.50' }],
  }, previous);
  assert.match(html, /data-branch-level="4"/);
  assert.match(html, /data-branch-level="5"/);
  assert.match(html, /data-branch-level="6" aria-label="Payees"/);
  assert.match(html, /data-vendor="ACME"/);
  assert.match(html, /About paid vendor vouchers/);
});

test('column reveal is opt-in for navigation renders', () => {
  const state = { path: ['02'] };
  assert.doesNotMatch(renderDrilldown(data, 'All city funds', '', state, previous), /is-entering is-animated/);
  assert.match(renderDrilldown(data, 'All city funds', '', { ...state, animate: true }, previous), /is-entering is-animated/);
});
