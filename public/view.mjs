import { fundOrder, money, revenueOrder, selectScope, share } from './model.mjs';

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

export function render(data, group = 'All city funds', fundCode = '') {
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
  const options = group === 'All city funds' ? '' : `<label class="fund-picker">Explore an individual fund
    <select id="fund-select"><option value="">All funds in ${safe(group)}</option>${data.funds
      .filter(f => f.fundGroup === group).sort((a, b) => a.fund.localeCompare(b.fund))
      .map(f => `<option value="${safe(f.fundCode)}" ${fundCode === f.fundCode ? 'selected' : ''}>${safe(f.fund)}</option>`).join('')}
    </select></label>`;
  return `<header class="page-header">
      <div class="masthead"><span class="brand-mark" aria-hidden="true">SF<span>↗</span></span><span>THE CITY LEDGER</span><span class="masthead-right">PUBLIC FINANCE / 2025</span></div>
      <div class="hero-copy"><p class="eyebrow">A clearer view of the city's finances</p>
      <h1>San Francisco's<br><em>money in and out.</em></h1>
      <p class="dek">Follow recorded revenue into the city's funds, then see which service areas recorded spending. One completed fiscal year, in one view.</p></div>
      <div class="meta-strip"><span>FY2025 ACTUALS <span class="meta-detail">JUL 2024 — JUN 2025</span></span>
      <span>Data as of <time datetime="${safe(data.dataAsOf.slice(0, 10))}">${safe(data.dataAsOf.slice(0, 10))}</time></span>
      <a href="${safe(data.sourceUrl)}" target="_blank" rel="noopener noreferrer">Controller's source data <span aria-hidden="true">↗</span></a></div>
    </header>
    <div class="selection" aria-live="polite"><div><span class="selection-label">CURRENT VIEW</span><strong>${safe(heading)}</strong><span class="selection-sub">Revenue and spending below both reflect this selection.</span></div><button type="button" data-all>All city funds <span aria-hidden="true">↗</span></button></div>
    <div class="columns">
      <section class="panel revenue-panel" aria-labelledby="revenue-heading"><div class="panel-top"><span class="step">01 / SOURCES</span><span class="panel-icon" aria-hidden="true">↓</span></div><h2 id="revenue-heading">Recorded revenue</h2><p class="total">${money(view.revenueTotal)}</p><p class="panel-description">Where money was recorded as coming from</p>${bars(revenue, view.revenueTotal, 'revenue')}</section>
      <section class="panel funds-panel" aria-labelledby="funds-heading"><div class="panel-top"><span class="step">02 / ACCOUNTS</span><span class="panel-icon" aria-hidden="true">◇</span></div><h2 id="funds-heading">City funds</h2><p class="panel-description funds-intro">Funds are the accounting layer between sources and uses. Select one to see both sides.</p><div class="fund-cards">${fundOrder.map(card).join('')}</div>${options}</section>
      <section class="panel spending-panel" aria-labelledby="spending-heading"><div class="panel-top"><span class="step">03 / USES</span><span class="panel-icon" aria-hidden="true">↑</span></div><h2 id="spending-heading">Recorded spending</h2><p class="total">${money(view.spendingTotal)}</p><p class="panel-description">Where departments recorded spending</p>${bars(spending, view.spendingTotal, 'spending')}</section>
    </div>
    <aside class="how-to-read"><span class="note-icon" aria-hidden="true">i</span><div><h2>How to read this</h2><p>Revenue and spending are recorded separately within each fund, so their annual totals need not match. Transfers and work orders can appear on both sides; signed adjustments reduce double counting. These records do not trace a specific tax dollar to a specific service. Amounts are nominal US dollars.</p></div></aside>
    <footer><span>THE CITY LEDGER <span aria-hidden="true">/</span> SAN FRANCISCO</span><a href="${safe(data.sourceUrl)}">View the underlying dataset ↗</a></footer>`;
}
