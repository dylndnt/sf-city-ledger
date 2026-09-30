import { render } from './view.mjs';

const root = document.getElementById('app');
let group = 'All city funds', fundCode = '', data;
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
  root.innerHTML = render(data, group, fundCode, detailsOpen);
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
  if (event.target.closest('[data-all]')) {
    group = 'All city funds'; fundCode = ''; draw();
    root.querySelector('[data-all]')?.focus();
    return;
  }
  const card = event.target.closest('[data-group]');
  if (card) {
    group = card.dataset.group; fundCode = ''; draw();
    [...root.querySelectorAll('[data-group]')].find(button => button.dataset.group === group)?.focus();
  }
});
root.addEventListener('change', event => {
  if (event.target.id === 'fund-select') {
    fundCode = event.target.value; draw();
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
