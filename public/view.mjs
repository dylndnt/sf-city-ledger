import { fundOrder, money, revenueOrder, selectScope, share } from './model.mjs';
import { renderSankey } from './sankey.mjs';

const safe = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

function bars(entries, total, side) {
  const scale = Math.max(1, ...entries.map(([, value]) => Math.abs(value)));
  return `<ul class="bars bars-${side}">${entries.map(([label, value]) => `
    <li class="bar-row">
      <div class="bar-label"><span>${safe(label)}</span><strong>${money(value)} <small>${share(value, total)}</small></strong></div>
      <div class="bar-track" aria-hidden="true"><span class="bar ${value < 0 ? 'negative' : 'positive'}" style="--width:${100 * Math.abs(value) / scale}%"></span></div>
    </li>`).join('')}</ul>`;
}

export function render(data, group = 'All city funds', fundCode = '', detailsOpen = false) {
  const view = selectScope(data, group, fundCode);
  const selected = data.funds.find(f => f.fundCode === fundCode && f.fundGroup === group);
  const heading = selected ? selected.fund : group;
  const revenue = revenueOrder.map(label => [label, view.revenue[label] ?? 0]);
  const spending = Object.entries(data.organizationGroups)
    .map(([code, label]) => [label, view.spending[code] ?? 0])
    .sort((a, b) => b[1] - a[1]);
  const card = name => {
    const scope = selectScope(data, name);
    return `<button type="button" class="fund-card" data-group="${safe(name)}" aria-pressed="${group === name}">
      <span class="fund-card-title">${safe(name)}<span class="fund-arrow" aria-hidden="true">↗</span></span>
      <span class="fund-card-stats"><span><small>Revenue</small><strong>${money(scope.revenueTotal)}</strong></span><span><small>Spending</small><strong>${money(scope.spendingTotal)}</strong></span></span>
    </button>`;
  };
  const groupFunds = data.funds.filter(f => f.fundGroup === group);
  const nameCounts = new Map();
  for (const fund of groupFunds) nameCounts.set(fund.fund, (nameCounts.get(fund.fund) ?? 0) + 1);
  const options = group === 'All city funds' ? '' : `<label class="fund-picker">Explore an individual fund
    <select id="fund-select"><option value="">All funds in ${safe(group)}</option>${groupFunds
      .sort((a, b) => a.fund.localeCompare(b.fund))
      .map(f => `<option value="${safe(f.fundCode)}" ${fundCode === f.fundCode ? 'selected' : ''}>${safe(f.fund)}${nameCounts.get(f.fund) > 1 ? ` (${safe(f.fundCode)})` : ''}</option>`).join('')}
    </select></label>`;
  const city = selectScope(data);
  return `<div class="masthead"><span class="brand-mark" aria-hidden="true">SF<span>↗</span></span><span>THE CITY LEDGER</span><span class="masthead-right">SAN FRANCISCO / PUBLIC FINANCE</span></div>
    <header class="page-header"><div class="intro"><p class="eyebrow">FY2025 ACTUALS · JUL 2024 — JUN 2025</p>
      <h1>Where the city's money<br><em>comes from and goes.</em></h1>
      <p class="dek">Revenue sources → <strong>city funds</strong> → spending areas</p></div>
      <div class="source-meta"><span>Data as of <time datetime="${safe(data.dataAsOf.slice(0, 10))}">${safe(data.dataAsOf.slice(0, 10))}</time></span>
      <a href="${safe(data.sourceUrl)}" target="_blank" rel="noopener noreferrer">Controller's source data ↗</a></div></header>
    <div class="overview-totals"><div><span>RECORDED REVENUE</span><strong>${money(city.revenueTotal)}</strong></div><span class="total-separator" aria-hidden="true">→</span><div><span>RECORDED SPENDING</span><strong>${money(city.spendingTotal)}</strong></div></div>
    ${renderSankey(data)}
    <p class="scope-note">These are accounting actuals, not a cash ledger. Funds sit between the two views; the ribbons do not trace particular tax dollars to particular services.</p>
    <details class="details" id="details-panel" ${detailsOpen ? 'open' : ''}><summary>Explore details <span>See categories and individual funds</span></summary><div class="details-body">
      <div class="selection" aria-live="polite"><div><span class="selection-label">CURRENT VIEW</span><strong>${safe(heading)}</strong><span class="selection-sub">Both detailed sides reflect this selection.</span></div><button type="button" data-all>All city funds <span aria-hidden="true">↗</span></button></div>
      <div class="columns">
        <section class="panel revenue-panel" aria-labelledby="revenue-heading"><div class="panel-top"><span class="step">01 / SOURCES</span><span class="panel-icon" aria-hidden="true">↓</span></div><h2 id="revenue-heading">Recorded revenue</h2><p class="total">${money(view.revenueTotal)}</p>${bars(revenue, view.revenueTotal, 'revenue')}</section>
        <section class="panel funds-panel" aria-labelledby="funds-heading"><div class="panel-top"><span class="step">02 / ACCOUNTS</span><span class="panel-icon" aria-hidden="true">◇</span></div><h2 id="funds-heading">City funds</h2><div class="fund-cards">${fundOrder.map(card).join('')}</div>${options}</section>
        <section class="panel spending-panel" aria-labelledby="spending-heading"><div class="panel-top"><span class="step">03 / USES</span><span class="panel-icon" aria-hidden="true">↑</span></div><h2 id="spending-heading">Recorded spending</h2><p class="total">${money(view.spendingTotal)}</p>${bars(spending, view.spendingTotal, 'spending')}</section>
      </div><aside class="how-to-read"><span class="note-icon" aria-hidden="true">i</span><div><h2>How to read this</h2><p>Revenue and spending are recorded separately within each fund, so their annual totals need not match. Transfers and work orders can appear on both sides; signed adjustments reduce double counting. Amounts are nominal US dollars.</p></div></aside>
    </div></details>
    <footer><span>THE CITY LEDGER <span aria-hidden="true">/</span> SAN FRANCISCO</span><a href="${safe(data.sourceUrl)}">View the underlying dataset ↗</a></footer>`;
}
