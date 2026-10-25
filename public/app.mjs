import { render } from './view.mjs';
import { latestOutcomes, outcomeUrl, vendorUrl, vendorDetailUrl, vendorPriorUrl, spendingLevels } from './drilldown.mjs';
import { loadSnapshots } from './load-data.mjs';

const root = document.getElementById('app');
let group = 'All city funds', fundCode = '', data, previousData;
let explorer = { path: [], vendors: [], vendorStatus: 'idle', vendorHasMore: false,
  selectedVendor: '', vouchers: [], voucherStatus: 'idle', voucherHasMore: false,
  outcomes: [], outcomeStatus: 'idle', priorVendorStatus: 'idle' };
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
const reuseBranchColumns = next => {
  const scrollPositions = [];
  const previous = new Map([...root.querySelectorAll('.branch-column[data-branch-key]')]
    .map(column => [column.dataset.branchKey, column]));
  for (const incoming of next.querySelectorAll('.branch-column[data-branch-key]')) {
    const existing = previous.get(incoming.dataset.branchKey);
    if (!existing) continue;
    const oldButtons = [...existing.querySelectorAll('.branch-item')];
    const newButtons = [...incoming.querySelectorAll('.branch-item')];
    const code = button => button.dataset.branchCode ?? button.dataset.nextCode;
    if (oldButtons.length !== newButtons.length || oldButtons.some((button, index) => code(button) !== code(newButtons[index]))) continue;
    const list = existing.querySelector('ul');
    scrollPositions.push({ list, top: list.scrollTop, left: list.scrollLeft });
    for (let index = 0; index < oldButtons.length; index++) {
      const oldButton = oldButtons[index];
      const newButton = newButtons[index];
      oldButton.className = newButton.className;
      for (const name of ['data-next-code', 'data-branch-depth', 'data-branch-code', 'data-focus-key', 'aria-current']) {
        if (newButton.hasAttribute(name)) oldButton.setAttribute(name, newButton.getAttribute(name));
        else oldButton.removeAttribute(name);
      }
      oldButton.querySelector('.branch-arrow').textContent = newButton.querySelector('.branch-arrow').textContent;
    }
    const keepAnimation = existing.classList.contains('is-animated') && incoming.classList.contains('is-entering');
    existing.className = incoming.className + (keepAnimation && !incoming.classList.contains('is-animated') ? ' is-animated' : '');
    incoming.replaceWith(existing);
  }
  return scrollPositions;
};
const keepSelectedVisible = () => {
  for (const column of root.querySelectorAll('.branch-column.is-ancestor')) {
    const list = column.querySelector('ul');
    const selected = list?.querySelector('.is-selected');
    if (!selected) continue;
    const viewport = list.getBoundingClientRect();
    const item = selected.getBoundingClientRect();
    if (item.left < viewport.left || item.right > viewport.right) {
      list.scrollLeft += item.left - viewport.left - (viewport.width - item.width) / 2;
    }
    if (item.top < viewport.top || item.bottom > viewport.bottom) {
      list.scrollTop += item.top - viewport.top - (viewport.height - item.height) / 2;
    }
  }
};
const draw = () => {
  hideFlowTooltip();
  const focused = document.activeElement;
  const inDrilldown = root.querySelector('#spending-drilldown')?.contains(focused);
  const focusId = inDrilldown && focused.id;
  const focusData = inDrilldown && ['vendor', 'depth', 'nextCode', 'focusKey', 'moreVendors', 'moreVouchers',
    'retryVendors', 'retryVouchers', 'retryOutcomes']
    .find(key => Object.hasOwn(focused.dataset, key));
  const focusValue = focusData && focused.dataset[focusData];
  const openInfoKeys = new Set([...root.querySelectorAll('details[data-info-key][open]')]
    .map(detail => detail.dataset.infoKey));
  const next = document.createElement('div');
  next.innerHTML = render(data, group, fundCode, false, explorer, previousData);
  const scrollPositions = reuseBranchColumns(next);
  root.replaceChildren(...next.childNodes);
  for (const { list, top, left } of scrollPositions) {
    list.scrollTop = top;
    list.scrollLeft = left;
  }
  for (const detail of root.querySelectorAll('details[data-info-key]')) {
    detail.open = openInfoKeys.has(detail.dataset.infoKey);
  }
  if (explorer.animate) keepSelectedVisible();
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
    outcomes: [], outcomeStatus: 'idle', priorVendorStatus: 'idle' };
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
    explorer.outcomes = latestOutcomes(rows, data.fiscalYear);
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

const loadPriorVendor = async () => {
  const generation = requestGeneration;
  const vendor = explorer.selectedVendor;
  explorer.priorVendorStatus = 'loading'; draw();
  try {
    const response = await fetch(vendorPriorUrl(data.fiscalYear, explorer.path, vendor,
      fundCode, selectedFundTypes()));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = await response.json();
    if (generation !== requestGeneration || vendor !== explorer.selectedVendor) return;
    explorer.previousVendorPaid = rows[0]?.paid ?? 0;
    explorer.priorVendorStatus = 'ready';
  } catch {
    if (generation !== requestGeneration || vendor !== explorer.selectedVendor) return;
    explorer.priorVendorStatus = 'error';
  }
  draw();
};

const choosePath = path => {
  const previous = explorer;
  const enteringChart = previous.path.length === 0;
  resetExplorer(path);
  explorer.animate = true;
  if (path[1] && path[1] === previous.path[1] && previous.outcomeStatus === 'ready') {
    explorer.outcomes = previous.outcomes;
    explorer.outcomeStatus = 'ready';
  }
  draw();
  if (enteringChart) root.querySelector('#spending-drilldown')?.scrollIntoView({ block: 'start',
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  root.querySelector('#drill-heading')?.focus({ preventScroll: true });
  if (explorer.outcomeStatus !== 'ready') loadOutcomes();
  loadVendors();
  explorer.animate = false;
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
root.addEventListener('keydown', event => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches?.('[data-spending-root]')) {
    event.preventDefault();
    choosePath([event.target.dataset.spendingRoot]);
  }
});

root.addEventListener('click', event => {
  if (event.target.closest('[data-jump-spending]')) {
    const scroller = root.querySelector('.sankey-scroll');
    scroller?.scrollTo({ left: scroller.scrollWidth - scroller.clientWidth, behavior: 'smooth' });
    return;
  }
  const spendingRoot = event.target.closest('[data-spending-root]');
  if (spendingRoot) { choosePath([spendingRoot.dataset.spendingRoot]); return; }
  const next = event.target.closest('[data-next-code]');
  if (next) { choosePath([...explorer.path, next.dataset.nextCode]); return; }
  const branch = event.target.closest('[data-branch-depth]');
  if (branch) {
    const depth = Number(branch.dataset.branchDepth);
    if (explorer.path[depth] !== branch.dataset.branchCode) {
      choosePath([...explorer.path.slice(0, depth), branch.dataset.branchCode]);
    }
    return;
  }
  const crumb = event.target.closest('[data-depth]');
  if (crumb) { choosePath(explorer.path.slice(0, Number(crumb.dataset.depth) + 1)); return; }
  const vendor = event.target.closest('[data-vendor]');
  if (vendor) {
    explorer.selectedVendor = vendor.dataset.vendor;
    explorer.selectedVendorPaid = explorer.vendors.find(row => row.vendor === explorer.selectedVendor)?.paid ?? 0;
    explorer.previousVendorPaid = null; explorer.priorVendorStatus = 'idle';
    explorer.vouchers = []; explorer.voucherStatus = 'idle'; explorer.voucherHasMore = false;
    draw(); loadVouchers(); loadPriorVendor(); return;
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
  if (event.target.id === 'group-select') {
    group = event.target.value; fundCode = ''; resetExplorer([]); draw();
    root.querySelector('#group-select')?.focus();
  }
  if (event.target.id === 'fund-select') {
    fundCode = event.target.value; resetExplorer([]); draw();
    root.querySelector('#fund-select')?.focus();
  }
});

try {
  ({ data, previousData } = await loadSnapshots());
  draw();
} catch {
  root.innerHTML = '<h1>Data unavailable</h1><p>The FY2025 snapshot could not be loaded. Please try again later.</p>';
}
