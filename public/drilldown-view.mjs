import { money, share } from './model.mjs';
import { compareSpending, outcomeUrl, spendingLevels } from './drilldown.mjs';

const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const date = value => safe(String(value || '').slice(0, 10));
const vendorMoney = value => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2,
}).format(Number(value) || 0);
const metricValue = (value, type) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return safe(value);
  if (type === 'Percent') return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(number * 100)}%`;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(number);
};
const metricChange = (current, previous, type) => {
  const difference = Number(current) - Number(previous);
  if (!Number.isFinite(difference)) return 'Unavailable';
  const amount = type === 'Percent' ? difference * 100 : difference;
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Math.abs(amount));
  return `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${formatted}${type === 'Percent' ? ' pp' : ''}`;
};

function vendorSection(state) {
  const status = state.vendorStatus || 'idle';
  let content = '<p>Choose a sub-object to inspect public vendor payments.</p>';
  if (status === 'loading') content = '<p role="status">Loading vendor payments…</p>';
  if (status === 'error') content = '<p role="alert">Vendor payments are unavailable right now. The accounting total above is still available.</p><button type="button" data-retry-vendors>Retry</button>';
  if (status === 'ready') content = state.vendors?.length
    ? `<ol class="vendor-list">${state.vendors.map(row => `<li><button type="button" data-vendor="${safe(row.vendor)}" aria-pressed="${state.selectedVendor === row.vendor}"><span>${safe(row.vendor || 'Unnamed payee')}${row.as_of ? `<small>Source date ${date(row.as_of)}</small>` : ''}</span><strong>${vendorMoney(row.paid)}</strong></button></li>`).join('')}</ol>
      ${state.vendorHasMore ? '<button type="button" class="load-more" data-more-vendors>Show more payees</button>' : ''}`
    : '<p>No public paid vendor vouchers match this exact path.</p>';
  let selected = '';
  if (state.selectedVendor) {
    let vouchers = '<p>Select a payee to load its public voucher records.</p>';
    if (state.voucherStatus === 'loading') vouchers = '<p role="status">Loading voucher records…</p>';
    if (state.voucherStatus === 'error') vouchers = '<p role="alert">Voucher records are unavailable right now.</p><button type="button" data-retry-vouchers>Retry</button>';
    if (state.voucherStatus === 'ready') vouchers = state.vouchers?.length
      ? `<ol class="voucher-list">${state.vouchers.map(row => `<li><div><strong>${safe(row.voucher || 'Voucher number unavailable')}</strong>${row.contract_title ? `<span>${safe(row.contract_title)}</span>` : ''}${row.contract_number ? `<small>Contract ${safe(row.contract_number)}</small>` : ''}${row.purchase_order ? `<small>Purchase order ${safe(row.purchase_order)}</small>` : ''}${row.data_as_of ? `<small>Source date ${date(row.data_as_of)}</small>` : ''}</div><strong>${vendorMoney(row.vouchers_paid)}</strong></li>`).join('')}</ol>${state.voucherHasMore ? '<button type="button" class="load-more" data-more-vouchers>Show more vouchers</button>' : ''}`
      : '<p>No individual voucher records were returned for this payee.</p>';
    let comparison = '<p>Prior-year paid vouchers unavailable.</p>';
    if (state.priorVendorStatus === 'loading') comparison = '<p role="status">Loading FY2024 paid vouchers…</p>';
    if (state.priorVendorStatus === 'ready') {
      const change = Number(state.selectedVendorPaid) - Number(state.previousVendorPaid);
      comparison = `<div class="vendor-comparison"><span>FY2025 paid vouchers <strong>${vendorMoney(state.selectedVendorPaid)}</strong></span><span>FY2024 paid vouchers <strong>${vendorMoney(state.previousVendorPaid)}</strong></span><span>Change <strong>${change > 0 ? '+' : ''}${vendorMoney(change)}</strong></span></div>`;
    }
    selected = `<div class="vendor-detail"><h4>${safe(state.selectedVendor)}</h4><p>Individual public payment records for this payee and spending path.</p>${comparison}${vouchers}</div>`;
  }
  return `<section class="related-card" aria-labelledby="vendor-heading"><h3 id="vendor-heading">Paid vendor vouchers</h3>
    <p>Named payees are a subset of spending. These payments have their own accounting basis and may not equal the recorded spending above.</p>
    ${content}${selected}<a href="https://data.sf.gov/d/n9pm-xkyq" target="_blank" rel="noopener noreferrer">Vendor payment source ↗</a></section>`;
}

function outcomeSection(state, fiscalYear, departmentCode) {
  const url = outcomeUrl(fiscalYear, departmentCode);
  let content = '<p>Choose a department to see its published measures.</p>';
  if (departmentCode && !url) content = '<p>No explicit city scorecard match is available for this department.</p>';
  if (url && state.outcomeStatus === 'loading') content = '<p role="status">Loading department measures…</p>';
  if (url && state.outcomeStatus === 'error') content = '<p role="alert">Department measures are unavailable right now.</p><button type="button" data-retry-outcomes>Retry</button>';
  if (url && state.outcomeStatus === 'ready') content = state.outcomes?.length
    ? `<ul class="outcome-list">${state.outcomes.map(row => `<li><span>${safe(row.measure_title)}</span>
        <strong>${metricValue(row.actual, row.measure_data_type)}</strong>
        <small>FY${safe(fiscalYear)} · observed ${date(row.calendar_month)}</small>
        <small>FY${safe(Number(fiscalYear) - 1)} · ${row.previous ? `${metricValue(row.previous.actual, row.measure_data_type)} · observed ${date(row.previous.calendar_month)}` : 'No prior observation'}</small>
        <b class="metric-change">${row.previous ? metricChange(row.actual, row.previous.actual, row.measure_data_type) : 'Change unavailable'}</b>
        ${row.measure_description || row.measure_methodology ? `<details class="measure-method"><summary>Definition and method</summary>${row.measure_description ? `<p>${safe(row.measure_description)}</p>` : ''}${row.measure_methodology ? `<p>${safe(row.measure_methodology)}</p>` : ''}</details>` : ''}
      </li>`).join('')}</ul>`
    : `<p>No measures with an observation date in FY${safe(fiscalYear)} are published for this department.</p>`;
  return `<section class="related-card" aria-labelledby="outcome-heading"><h3 id="outcome-heading">Related department outcomes</h3>
    <p>These measures describe the department, not the effect of this particular program, sub-object, or vendor payment. Reporting periods vary; check each measure's definition.</p>
    ${content}<a href="https://data.sf.gov/d/kc49-udxn" target="_blank" rel="noopener noreferrer">Scorecard source ↗</a></section>`;
}

export function renderDrilldown(data, group, fundCode, state = {}, previousData = null) {
  const path = state.path || [];
  const selected = compareSpending(data, previousData, group, fundCode, path);
  const crumb = `<nav class="drill-breadcrumb" aria-label="Spending path"><button type="button" data-depth="-1">All spending</button>${selected.breadcrumbs.map((part, index) => `<span aria-hidden="true">›</span><button type="button" data-depth="${index}">${safe(part.label)}</button>`).join('')}</nav>`;
  const maxAmount = Math.max(1, ...selected.entries.map(item => Math.abs(item.amount)));
  const options = selected.level
    ? `<div class="zoom-flow" aria-label="${safe(selected.level.name)} breakdown"><div class="zoom-parent"><span>CURRENT CATEGORY</span><strong>${safe(selected.breadcrumbs.at(-1)?.label || 'All recorded spending')}</strong><b>${money(selected.total)}</b></div><div class="zoom-children"><p class="zoom-next">${safe(selected.level.name)} <span>Click a branch to zoom in ↗</span></p><ul>${selected.entries.map(item => `<li><button type="button" data-next-code="${safe(item.code)}" aria-label="Open ${safe(item.label)}, ${money(item.amount)}"><span class="zoom-bar" style="--flow-width:${Math.max(2, 100 * Math.abs(item.amount) / maxAmount)}%"></span><span class="zoom-row"><span class="zoom-name">${safe(item.label)}<small>${safe(item.code)}</small></span><strong>${money(item.amount)}<small>${share(item.amount, selected.total)}</small></strong><span aria-hidden="true">↗</span></span><span class="zoom-compare">${item.previous === null ? 'Prior year unavailable' : `FY${safe(Number(data.fiscalYear) - 1)} ${money(item.previous)} · ${item.change >= 0 ? '+' : ''}${money(item.change)} change`}</span></button></li>`).join('')}</ul></div></div>`
    : '<p class="drill-instruction">This is the deepest spending classification in the accounting actuals. Matching named payees and individual vouchers appear here.</p>';
  const level = selected.level ? safe(selected.level.name) : 'Payees and vouchers';
  const related = path.length >= 2
    ? `<div class="related-grid">${outcomeSection(state, data.fiscalYear, selected.departmentCode)}${path.length === spendingLevels.length ? vendorSection(state) : ''}</div>`
    : '';
  const prior = selected.previous === null ? 'Prior-year spending unavailable' :
    `FY${safe(Number(data.fiscalYear) - 1)} ${money(selected.previous)} · change ${selected.change >= 0 ? '+' : ''}${money(selected.change)}`;
  return `<section class="zoom-chart drilldown" id="spending-drilldown" aria-labelledby="drill-heading"><div class="drill-head"><div><p class="step">FOLLOW THE SPENDING / LEVEL ${path.length} OF ${spendingLevels.length}</p><h2 id="drill-heading" tabindex="-1">${safe(selected.breadcrumbs.at(-1)?.label || 'All spending')}</h2></div><span>Next: ${level}</span></div>
    ${crumb}<div class="drill-total"><span>Recorded spending in this path</span><strong>${money(selected.total)}</strong><small>${prior}</small></div>
    <div class="zoom-workspace"><div>${options}</div>${related}</div></section>`;
}
