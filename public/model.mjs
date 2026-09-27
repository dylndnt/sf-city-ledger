export const fundOrder = ['General Fund', 'Enterprise Funds', 'Special Revenue Funds', 'Other funds'];
export const revenueOrder = [
  'Taxes', 'Charges for services', 'Intergovernmental revenue',
  'Other operating revenue', 'Financing, transfers and recoveries',
];

function add(target, values) {
  for (const [key, cents] of Object.entries(values)) target[key] = (target[key] ?? 0) + cents;
}

export function selectScope(data, group = 'All city funds', fundCode = '') {
  const candidates = data.funds.filter(f => group === 'All city funds' || f.fundGroup === group);
  if (fundCode && !candidates.some(f => f.fundCode === fundCode)) {
    throw new Error('fund outside selected group');
  }
  const funds = fundCode ? candidates.filter(f => f.fundCode === fundCode) : candidates;
  const revenue = {}, spending = {};
  for (const fund of funds) {
    add(revenue, fund.revenueGroups);
    add(spending, fund.spendingGroups);
  }
  return {
    funds, revenue, spending,
    revenueTotal: Object.values(revenue).reduce((a, b) => a + b, 0),
    spendingTotal: Object.values(spending).reduce((a, b) => a + b, 0),
  };
}

export const money = cents => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2,
}).format(cents / 100);

export const share = (part, total) => total > 0 ? `${(100 * part / total).toFixed(1)}%` : 'n/a';
