import { render } from './view.mjs';
import { latestOutcomes, outcomeUrl, vendorUrl, vendorDetailUrl, spendingLevels } from './drilldown.mjs';

const root = document.getElementById('app');
let group = 'All city funds', fundCode = '', data;
let explorer = { path: [], vendors: [], vendorStatus: 'idle', vendorHasMore: false,
  selectedVendor: '', vouchers: [], voucherStatus: 'idle', voucherHasMore: false,
  outcomes: [], outcomeStatus: 'idle' };
let requestGeneration = 0;
let voucherGeneration = 0;
const hideFlowTooltip = () => {
  const tooltip = root.querySelector('.flow-tooltip');
  if (tooltip) tooltip.hidden = true;
};
const showFlowTooltip = (flow, event) => {
  const tooltip = root.querySelector('.flow-tooltip');
  if (!tooltip || !flow) return;
  tooltip.querySelector('[data-tooltip-amount]').textContent = flow.dataset.amount;
  tooltip.querySelector('[data-tooltip-route]').textContent = flow.dataset.route;
  tooltip.hidden = false;
  const rect = flow.getBoundingClientRect();
  const x = event.clientX ?? rect.left + rect.width / 2;
  const y = event.clientY ?? rect.top + rect.height / 2;
  tooltip.style.left = `${Math.max(12, Math.min(x + 16, window.innerWidth - tooltip.offsetWidth - 12))}px`;
  tooltip.style.top = `${Math.max(12, Math.min(y + 16, window.innerHeight - tooltip.offsetHeight - 12))}px`;
};
const draw = () => {
  hideFlowTooltip();
  const detailsOpen = root.querySelector('#details-panel')?.open ?? false;
  const focused = document.activeElement;
  const inDrilldown = root.querySelector('#spending-drilldown')?.contains(focused);
  const focusId = inDrilldown && focused.id;
  const focusData = inDrilldown && ['vendor', 'depth', 'nextCode', 'moreVendors', 'moreVouchers',
    'retryVendors', 'retryVouchers', 'retryOutcomes']
    .find(key => Object.hasOwn(focused.dataset, key));
  const focusValue = focusData && focused.dataset[focusData];
  root.innerHTML = render(data, group, fundCode, detailsOpen, explorer);
  if (inDrilldown) {
    const replacement = (focusId && root.querySelector(`#${focusId}`))
      || (focusData && [...root.querySelectorAll(`[data-${focusData.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}]`)]
        .find(node => node.dataset[focusData] === focusValue))
      || root.querySelector('#drill-heading');
    replacement?.focus({ preventScroll: true });
  }
};

const resetExplorer = path => {
  requestGeneration++;
  voucherGeneration++;
  explorer = { path, vendors: [], vendorStatus: 'idle', vendorHasMore: false,
    selectedVendor: '', vouchers: [], voucherStatus: 'idle', voucherHasMore: false,
    outcomes: [], outcomeStatus: 'idle' };
};

const selectedFundTypes = () => group === 'All city funds' ? [] :
  [...new Set(data.funds.filter(fund => fund.fundGroup === group).map(fund => fund.fundTypeCode))];

const loadOutcomes = async () => {
  const departmentCode = explorer.path[1];
  const url = departmentCode && outcomeUrl(data.fiscalYear, departmentCode);
  if (!url) return;
  const generation = requestGeneration;
  explorer.outcomeStatus = 'loading'; draw();
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = await response.json();
    if (generation !== requestGeneration) return;
    explorer.outcomes = latestOutcomes(rows);
    explorer.outcomeStatus = 'ready';
  } catch {
    if (generation !== requestGeneration) return;
    explorer.outcomeStatus = 'error';
  }
  draw();
};

const loadVendors = async (offset = 0) => {
  if (explorer.path.length !== spendingLevels.length) return;
  const generation = requestGeneration;
  explorer.vendorStatus = 'loading'; draw();
  try {
    const response = await fetch(vendorUrl(data.fiscalYear, explorer.path, fundCode, offset, selectedFundTypes()));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = await response.json();
    if (generation !== requestGeneration) return;
    explorer.vendors = offset ? [...explorer.vendors, ...rows.slice(0, 50)] : rows.slice(0, 50);
    explorer.vendorHasMore = rows.length > 50;
    explorer.vendorStatus = 'ready';
  } catch {
    if (generation !== requestGeneration) return;
    explorer.vendorStatus = 'error';
  }
  draw();
};

const loadVouchers = async (offset = 0) => {
  if (!explorer.selectedVendor) return;
  const generation = requestGeneration;
  const vendor = explorer.selectedVendor;
  const voucherRequest = ++voucherGeneration;
  explorer.voucherStatus = 'loading'; draw();
  try {
    const response = await fetch(vendorDetailUrl(data.fiscalYear, explorer.path, vendor, fundCode, offset, selectedFundTypes()));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = await response.json();
    if (generation !== requestGeneration || voucherRequest !== voucherGeneration || vendor !== explorer.selectedVendor) return;
    explorer.vouchers = offset ? [...explorer.vouchers, ...rows.slice(0, 50)] : rows.slice(0, 50);
    explorer.voucherHasMore = rows.length > 50;
    explorer.voucherStatus = 'ready';
  } catch {
    if (generation !== requestGeneration || voucherRequest !== voucherGeneration || vendor !== explorer.selectedVendor) return;
    explorer.voucherStatus = 'error';
  }
  draw();
};

const choosePath = path => {
  const previous = explorer;
  resetExplorer(path);
  if (path[1] && path[1] === previous.path[1] && previous.outcomeStatus === 'ready') {
    explorer.outcomes = previous.outcomes;
    explorer.outcomeStatus = 'ready';
  }
  draw();
  root.querySelector('#spending-drilldown')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  root.querySelector('#drill-heading')?.focus({ preventScroll: true });
  if (explorer.outcomeStatus !== 'ready') loadOutcomes();
  loadVendors();
};

root.addEventListener('pointerover', event => showFlowTooltip(event.target.closest?.('[data-flow]'), event));
root.addEventListener('pointermove', event => showFlowTooltip(event.target.closest?.('[data-flow]'), event));
root.addEventListener('pointerout', event => {
  const flow = event.target.closest?.('[data-flow]');
  if (flow && !flow.contains(event.relatedTarget)) hideFlowTooltip();
});
root.addEventListener('focusin', event => showFlowTooltip(event.target.closest?.('[data-flow]'), event));
root.addEventListener('focusout', event => {
  if (event.target.closest?.('[data-flow]')) hideFlowTooltip();
});
root.addEventListener('scroll', hideFlowTooltip, true);

root.addEventListener('click', event => {
  const spendingRoot = event.target.closest('[data-spending-root]');
  if (spendingRoot) { choosePath([spendingRoot.dataset.spendingRoot]); return; }
  const next = event.target.closest('[data-next-code]');
  if (next) { choosePath([...explorer.path, next.dataset.nextCode]); return; }
  const crumb = event.target.closest('[data-depth]');
  if (crumb) { choosePath(explorer.path.slice(0, Number(crumb.dataset.depth) + 1)); return; }
  const vendor = event.target.closest('[data-vendor]');
  if (vendor) {
    explorer.selectedVendor = vendor.dataset.vendor;
    explorer.vouchers = []; explorer.voucherStatus = 'idle'; explorer.voucherHasMore = false;
    draw(); loadVouchers(); return;
  }
  if (event.target.closest('[data-more-vendors]')) { loadVendors(explorer.vendors.length); return; }
  if (event.target.closest('[data-retry-vendors]')) { loadVendors(explorer.vendors.length); return; }
  if (event.target.closest('[data-more-vouchers]')) { loadVouchers(explorer.vouchers.length); return; }
  if (event.target.closest('[data-retry-vouchers]')) { loadVouchers(explorer.vouchers.length); return; }
  if (event.target.closest('[data-retry-outcomes]')) { loadOutcomes(); return; }
  if (event.target.closest('[data-all]')) {
    group = 'All city funds'; fundCode = ''; resetExplorer([]); draw();
    root.querySelector('[data-all]')?.focus();
    return;
  }
  const card = event.target.closest('[data-group]');
  if (card) {
    group = card.dataset.group; fundCode = ''; resetExplorer([]); draw();
    [...root.querySelectorAll('[data-group]')].find(button => button.dataset.group === group)?.focus();
  }
});
root.addEventListener('change', event => {
  if (event.target.id === 'fund-select') {
    fundCode = event.target.value; resetExplorer([]); draw();
    root.querySelector('#fund-select')?.focus();
  }
});

try {
  const response = await fetch('./data/fy2025.json');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  data = await response.json();
  draw();
} catch {
  root.innerHTML = '<h1>Data unavailable</h1><p>The FY2025 snapshot could not be loaded. Please try again later.</p>';
}
