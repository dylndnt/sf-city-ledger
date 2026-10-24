import { money, share } from './model.mjs';
import { drilldown, outcomeUrl, spendingLevels } from './drilldown.mjs';

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
    selected = `<div class="vendor-detail"><h4>${safe(state.selectedVendor)}</h4><p>Individual public payment records for this payee and spending path.</p>${vouchers}</div>`;
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
        <small>Observed ${date(row.calendar_month)}</small>
        ${row.measure_description || row.measure_methodology ? `<details class="measure-method"><summary>Definition and method</summary>${row.measure_description ? `<p>${safe(row.measure_description)}</p>` : ''}${row.measure_methodology ? `<p>${safe(row.measure_methodology)}</p>` : ''}</details>` : ''}
      </li>`).join('')}</ul>`
    : `<p>No measures with an observation date in FY${safe(fiscalYear)} are published for this department.</p>`;
  return `<section class="related-card" aria-labelledby="outcome-heading"><h3 id="outcome-heading">Related department outcomes</h3>
    <p>These measures describe the department, not the effect of this particular program, sub-object, or vendor payment. Reporting periods vary; check each measure's definition.</p>
    ${content}<a href="https://data.sf.gov/d/kc49-udxn" target="_blank" rel="noopener noreferrer">Scorecard source ↗</a></section>`;
}

export function renderDrilldown(data, group, fundCode, state = {}) {
  const path = state.path || [];
  const selected = drilldown(data, group, fundCode, path);
  const crumb = `<nav class="drill-breadcrumb" aria-label="Spending path"><button type="button" data-depth="-1">All spending</button>${selected.breadcrumbs.map((part, index) => `<span aria-hidden="true">›</span><button type="button" data-depth="${index}">${safe(part.label)}</button>`).join('')}</nav>`;
  const options = selected.level
    ? `<p class="drill-instruction">Select ${selected.level.name === 'Object' ? 'an' : 'a'} ${safe(selected.level.name.toLowerCase())} to go deeper.</p><ul class="drill-options">${selected.entries.map(item => `<li><button type="button" data-next-code="${safe(item.code)}"><span>${safe(item.label)}<small>${safe(item.code)}</small></span><strong>${money(item.amount)}<small>${share(item.amount, selected.total)}</small></strong><span aria-hidden="true">›</span></button></li>`).join('')}</ul>`
    : '<p class="drill-instruction">This is the most detailed spending classification the city publishes in its accounting actuals. Matching public vendor payments appear below.</p>';
  const level = selected.level ? safe(selected.level.name) : 'Payees and vouchers';
  const related = path.length >= 2
    ? `<div class="related-grid">${outcomeSection(state, data.fiscalYear, selected.departmentCode)}${path.length === spendingLevels.length ? vendorSection(state) : ''}</div>`
    : '';
  return `<section class="drilldown" id="spending-drilldown" aria-labelledby="drill-heading"><div class="drill-head"><div><p class="step">SPENDING DRILLDOWN</p><h2 id="drill-heading" tabindex="-1">Follow the spending</h2></div><span>Next: ${level}</span></div>
    ${crumb}<div class="drill-total"><span>Recorded spending in this path</span><strong>${money(selected.total)}</strong></div>
    ${path.length ? options : '<p class="drill-instruction">Choose a spending area above or below to begin.</p>'}
    ${related}</section>`;
}
