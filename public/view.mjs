import { fundOrder, money, selectScope } from './model.mjs';
import { renderSankey } from './sankey.mjs';
import { renderDrilldown } from './drilldown-view.mjs';

const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

export function render(data, group = 'All city funds', fundCode = '', _detailsOpen = false, explorer = {}, previousData = null) {
  const path = explorer.path || [];
  const scope = selectScope(data, group, fundCode);
  const groupFunds = data.funds.filter(fund => fund.fundGroup === group);
  const picker = group === 'All city funds' ? '' : `<label class="scope-control">Individual fund
    <select id="fund-select"><option value="">All funds in ${safe(group)}</option>${groupFunds
      .sort((a, b) => a.fund.localeCompare(b.fund))
      .map(fund => `<option value="${safe(fund.fundCode)}" ${fundCode === fund.fundCode ? 'selected' : ''}>${safe(fund.fund)} (${safe(fund.fundCode)})</option>`).join('')}
    </select></label>`;
  return `<div class="masthead"><span class="brand-mark" aria-hidden="true">SF<span>↗</span></span><span>THE CITY LEDGER</span><span class="masthead-right">SAN FRANCISCO / PUBLIC FINANCE</span></div>
    <section class="chart-shell" aria-label="Explore San Francisco spending"><header class="chart-intro"><div><p class="eyebrow">FY${safe(data.fiscalYear)} RECORDED ACTUALS · INTERACTIVE CITY LEDGER</p><h1>Where the money goes<span>.</span></h1><p>Start with a spending area in the chart. Each selection opens the next layer here.</p></div><div class="source-meta"><span>Data as of <time datetime="${safe(data.dataAsOf.slice(0, 10))}">${safe(data.dataAsOf.slice(0, 10))}</time></span><a href="${safe(data.sourceUrl)}" target="_blank" rel="noopener noreferrer">Controller's source data ↗</a></div></header>
    <div class="chart-toolbar"><div class="chart-totals"><span>Recorded revenue <strong>${money(scope.revenueTotal)}</strong></span><span>Recorded spending <strong>${money(scope.spendingTotal)}</strong></span></div><div class="scope-controls"><label class="scope-control">Fund view<select id="group-select"><option value="All city funds" ${group === 'All city funds' ? 'selected' : ''}>All city funds</option>${fundOrder.map(name => `<option value="${safe(name)}" ${group === name ? 'selected' : ''}>${safe(name)}</option>`).join('')}</select></label>${picker}</div><details class="chart-help" data-info-key="chart"><summary>About this chart</summary><div>Revenue and spending are separate accounting views; a revenue ribbon does not trace a specific dollar to a payment. Choose a spending area or its ribbon to follow recorded spending. Prior-year comparisons use FY${safe(Number(data.fiscalYear) - 1)} actuals.</div></details></div>
    <div class="chart-stage" aria-live="polite">${path.length ? renderDrilldown(data, group, fundCode, explorer, previousData) : renderSankey(data, group, fundCode)}</div>
    </section>
    <footer><span>THE CITY LEDGER <span aria-hidden="true">/</span> SAN FRANCISCO</span><a href="${safe(data.sourceUrl)}" target="_blank" rel="noopener noreferrer">View the underlying dataset ↗</a></footer>`;
}
