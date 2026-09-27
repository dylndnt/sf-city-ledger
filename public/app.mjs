import { render } from './view.mjs';

const root = document.getElementById('app');
let group = 'All city funds', fundCode = '', data;
const draw = () => { root.innerHTML = render(data, group, fundCode); };

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
