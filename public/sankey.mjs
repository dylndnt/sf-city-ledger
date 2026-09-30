import { fundOrder, money, revenueOrder } from './model.mjs';

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const sum = values => values.reduce((total, value) => total + value, 0);
const exactMoney = cents => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2,
}).format(cents / 100);

export function buildSankey(data) {
  const revenue = new Map();
  const spending = new Map();
  const fundTotals = new Map();
  for (const group of fundOrder) {
    revenue.set(group, new Map());
    spending.set(group, new Map());
    fundTotals.set(group, { revenue: 0, spending: 0 });
  }
  for (const fund of data.funds) {
    if (!revenue.has(fund.fundGroup)) throw new Error(`unknown fund group: ${fund.fundGroup}`);
    const totals = fundTotals.get(fund.fundGroup);
    for (const [label, cents] of Object.entries(fund.revenueGroups)) {
      revenue.get(fund.fundGroup).set(label, (revenue.get(fund.fundGroup).get(label) ?? 0) + cents);
      totals.revenue += cents;
    }
    for (const [code, cents] of Object.entries(fund.spendingGroups)) {
      spending.get(fund.fundGroup).set(code, (spending.get(fund.fundGroup).get(code) ?? 0) + cents);
      totals.spending += cents;
    }
  }

  const revenueLinks = [], spendingLinks = [], reverseLinks = [];
  const presentFunds = fundOrder.filter(group => data.funds.some(f => f.fundGroup === group));
  for (const group of presentFunds) {
    for (const label of revenueOrder) {
      const cents = revenue.get(group).get(label) ?? 0;
      if (cents > 0) revenueLinks.push({ source: label, target: group, cents });
      if (cents < 0) reverseLinks.push({ side: 'revenue', source: group, target: label, cents });
    }
    for (const code of Object.keys(data.organizationGroups)) {
      const cents = spending.get(group).get(code) ?? 0;
      if (cents > 0) spendingLinks.push({ source: group, target: code, cents });
      if (cents < 0) reverseLinks.push({ side: 'spending', source: code, target: group, cents });
    }
  }

  const sources = revenueOrder.map(label => ({
    id: label, label,
    cents: sum(presentFunds.map(group => revenue.get(group).get(label) ?? 0)),
    flowCents: sum(revenueLinks.filter(link => link.source === label).map(link => link.cents)),
  })).filter(node => node.cents || node.flowCents);
  const funds = presentFunds.map(group => ({
    id: group, label: group,
    revenueCents: fundTotals.get(group).revenue,
    spendingCents: fundTotals.get(group).spending,
    inboundCents: sum(revenueLinks.filter(link => link.target === group).map(link => link.cents)),
    outboundCents: sum(spendingLinks.filter(link => link.source === group).map(link => link.cents)),
  }));
  const uses = Object.entries(data.organizationGroups).map(([code, label]) => ({
    id: code, label,
    cents: sum(presentFunds.map(group => spending.get(group).get(code) ?? 0)),
    flowCents: sum(spendingLinks.filter(link => link.target === code).map(link => link.cents)),
  })).filter(node => node.cents || node.flowCents).sort((a, b) => b.cents - a.cents);

  return {
    sources, funds, uses, revenueLinks, spendingLinks, reverseLinks,
    totals: {
      revenue: sum(funds.map(fund => fund.revenueCents)),
      spending: sum(funds.map(fund => fund.spendingCents)),
    },
  };
}

function positionColumn(nodes, flowKey, x, minHeight, gap, scale) {
  const sized = nodes.map(node => ({ ...node, x, flowHeight: node[flowKey] * scale,
    height: Math.max(minHeight, node[flowKey] * scale) }));
  const totalHeight = sum(sized.map(node => node.height)) + gap * Math.max(0, sized.length - 1);
  if (totalHeight > 510) throw new Error('Sankey column exceeds available height');
  let y = 70 + (510 - totalHeight) / 2;
  for (const node of sized) {
    node.y = y;
    node.portY = y + (node.height - node.flowHeight) / 2;
    y += node.height + gap;
  }
  return sized;
}

export function layoutSankey(graph) {
  const positiveRevenue = sum(graph.revenueLinks.map(link => link.cents));
  const positiveSpending = sum(graph.spendingLinks.map(link => link.cents));
  let scale = 270 / Math.max(1, positiveRevenue, positiveSpending);
  const columnHeight = (values, minimum, gap) =>
    sum(values.map(cents => Math.max(minimum, cents * scale))) + gap * Math.max(0, values.length - 1);
  const fundFlows = graph.funds.map(fund => Math.max(fund.inboundCents, fund.outboundCents));
  for (let attempt = 0; attempt < 60; attempt++) {
    if (columnHeight(graph.sources.map(node => node.flowCents), 54, 22) <= 510
      && columnHeight(fundFlows, 60, 22) <= 510
      && columnHeight(graph.uses.map(node => node.flowCents), 54, 12) <= 510) break;
    scale *= 0.9;
  }
  const sources = positionColumn(graph.sources, 'flowCents', 185, 54, 22, scale);
  const funds = positionColumn(graph.funds.map(fund => ({
    ...fund, flowCents: Math.max(fund.inboundCents, fund.outboundCents),
  })), 'flowCents', 490, 60, 22, scale);
  const uses = positionColumn(graph.uses, 'flowCents', 950, 54, 12, scale);
  const sourceById = new Map(sources.map(node => [node.id, node]));
  const fundById = new Map(funds.map(node => [node.id, node]));
  const useById = new Map(uses.map(node => [node.id, node]));
  const sourceOffset = new Map(), fundInboundOffset = new Map();
  const fundOutboundOffset = new Map(), useOffset = new Map();
  const revenueLinks = [];
  for (const source of sources) {
    for (const fund of funds) {
      const link = graph.revenueLinks.find(item => item.source === source.id && item.target === fund.id);
      if (!link) continue;
      const thickness = link.cents * scale;
      const sourceY = source.portY + (sourceOffset.get(source.id) ?? 0);
      const targetY = fund.y + (fund.height - fund.inboundCents * scale) / 2
        + (fundInboundOffset.get(fund.id) ?? 0);
      revenueLinks.push({ ...link, x0: source.x + 10, x1: fund.x, y0: sourceY, y1: targetY, thickness });
      sourceOffset.set(source.id, (sourceOffset.get(source.id) ?? 0) + thickness);
      fundInboundOffset.set(fund.id, (fundInboundOffset.get(fund.id) ?? 0) + thickness);
    }
  }
  const spendingLinks = [];
  for (const fund of funds) {
    for (const use of uses) {
      const link = graph.spendingLinks.find(item => item.source === fund.id && item.target === use.id);
      if (!link) continue;
      const thickness = link.cents * scale;
      const sourceY = fund.y + (fund.height - fund.outboundCents * scale) / 2
        + (fundOutboundOffset.get(fund.id) ?? 0);
      const targetY = use.portY + (useOffset.get(use.id) ?? 0);
      spendingLinks.push({ ...link, x0: fund.x + 230, x1: use.x, y0: sourceY, y1: targetY, thickness });
      fundOutboundOffset.set(fund.id, (fundOutboundOffset.get(fund.id) ?? 0) + thickness);
      useOffset.set(use.id, (useOffset.get(use.id) ?? 0) + thickness);
    }
  }
  return { sources, funds, uses, revenueLinks, spendingLinks, reverseLinks: graph.reverseLinks,
    sourceById, fundById, useById, scale };
}

function ribbon(link) {
  const { x0, x1, y0, y1, thickness } = link;
  const mid = (x0 + x1) / 2;
  return `M ${x0} ${y0} C ${mid} ${y0}, ${mid} ${y1}, ${x1} ${y1}
    L ${x1} ${y1 + thickness} C ${mid} ${y1 + thickness}, ${mid} ${y0 + thickness}, ${x0} ${y0 + thickness} Z`;
}

function textLines(label, maxLength) {
  const words = label.split(' '), lines = [];
  let current = '';
  for (const word of words) {
    if (current && `${current} ${word}`.length > maxLength) {
      lines.push(current);
      current = word;
    } else current = current ? `${current} ${word}` : word;
  }
  if (current) lines.push(current);
  return lines;
}

function nodeLabel(node, x, anchor, maxLength, amount) {
  const lines = textLines(node.label, maxLength);
  const firstY = node.y + Math.max(15, (node.height - (lines.length + 1) * 15) / 2 + 14);
  return `<text x="${x}" y="${firstY}" text-anchor="${anchor}" class="sankey-label">${lines.map((line, index) =>
    `<tspan x="${x}" dy="${index ? 15 : 0}">${escapeHtml(line)}</tspan>`).join('')}
    <tspan x="${x}" dy="17" class="sankey-amount">${escapeHtml(money(amount))}</tspan></text>`;
}

export function renderSankey(data) {
  const graph = buildSankey(data), layout = layoutSankey(graph);
  const sourceColors = ['#438c86', '#6a9e9a', '#86aaa0', '#a8aea0', '#be9573'];
  const fundColors = ['#b56c55', '#398278', '#698d9a', '#aa9464'];
  const revenuePaths = layout.revenueLinks.map(link => {
    const color = sourceColors[graph.sources.findIndex(node => node.id === link.source) % sourceColors.length];
    const route = `${link.source} → ${link.target}`;
    return `<path class="sankey-ribbon" d="${ribbon(link)}" fill="${color}" data-flow="true" data-amount="${escapeHtml(exactMoney(link.cents))}" data-route="${escapeHtml(route)}" tabindex="0" aria-label="${escapeHtml(`${route}: ${exactMoney(link.cents)}`)}"/>`;
  }).join('');
  const spendingPaths = layout.spendingLinks.map(link => {
    const color = fundColors[graph.funds.findIndex(node => node.id === link.source) % fundColors.length];
    const use = graph.uses.find(node => node.id === link.target);
    const route = `${link.source} → ${use.label}`;
    return `<path class="sankey-ribbon" d="${ribbon(link)}" fill="${color}" data-flow="true" data-amount="${escapeHtml(exactMoney(link.cents))}" data-route="${escapeHtml(route)}" tabindex="0" aria-label="${escapeHtml(`${route}: ${exactMoney(link.cents)}`)}"/>`;
  }).join('');
  const sourceNodes = layout.sources.map((node, index) => `<g data-node="source">
    <rect x="${node.x}" y="${node.portY}" width="10" height="${Math.max(1, node.flowHeight)}" rx="2" fill="${sourceColors[index % sourceColors.length]}"/>
    ${nodeLabel(node, node.x - 15, 'end', 23, node.cents)}</g>`).join('');
  const fundNodes = layout.funds.map((node, index) => `<g data-node="fund">
    <rect x="${node.x}" y="${node.y}" width="230" height="${node.height}" rx="7" fill="#173e43"/>
    <rect x="${node.x}" y="${node.y}" width="5" height="${node.height}" rx="2" fill="${fundColors[index % fundColors.length]}"/>
    <text x="${node.x + 18}" y="${node.y + 23}" class="sankey-fund-name">${escapeHtml(node.label)}</text>
    <text x="${node.x + 18}" y="${node.y + 43}" class="sankey-fund-value">In ${escapeHtml(money(node.revenueCents))} <tspan dx="8">Out ${escapeHtml(money(node.spendingCents))}</tspan></text>
    <title>${escapeHtml(node.label)}: recorded revenue ${exactMoney(node.revenueCents)}; recorded spending ${exactMoney(node.spendingCents)}</title>
    </g>`).join('');
  const useNodes = layout.uses.map(node => `<g data-node="use">
    <rect x="${node.x}" y="${node.portY}" width="10" height="${Math.max(1, node.flowHeight)}" rx="2" fill="#bd765d"/>
    ${nodeLabel(node, node.x + 17, 'start', 26, node.cents)}</g>`).join('');
  const reverse = layout.reverseLinks.map((link, index) => {
    const from = link.side === 'revenue' ? layout.fundById.get(link.source) : layout.useById.get(link.source);
    const to = link.side === 'revenue' ? layout.sourceById.get(link.target) : layout.fundById.get(link.target);
    if (!from || !to) throw new Error('reverse link endpoint missing');
    const fromX = link.side === 'revenue' ? from.x - 3 : from.x + 12;
    const toX = link.side === 'revenue' ? to.x + 12 : to.x + 230;
    const lane = 615 + index * 28;
    const path = `M ${fromX} ${from.y + from.height} Q ${fromX - 10} ${lane} ${fromX - 55} ${lane} L ${toX + 55} ${lane} Q ${toX} ${lane} ${toX} ${to.y + to.height}`;
    const amount = `−${money(Math.abs(link.cents))}`;
    const route = `${link.source} → ${link.target} · reverse adjustment`;
    return `<g data-reverse="true"><path d="${path}" class="sankey-reverse" marker-end="url(#reverse-arrow)" data-flow="true" data-amount="${escapeHtml(`−${exactMoney(Math.abs(link.cents))}`)}" data-route="${escapeHtml(route)}" tabindex="0" aria-label="${escapeHtml(`${route}: ${exactMoney(link.cents)}`)}"/>
      <text x="350" y="${lane - 8}" text-anchor="middle" class="sankey-reverse-label">${escapeHtml(amount)} reverse adjustment</text></g>`;
  }).join('');
  const height = Math.max(670, 645 + layout.reverseLinks.length * 28);
  return `<figure class="sankey-figure"><p class="sankey-scroll-hint">Swipe to see funds and spending →</p><div class="sankey-scroll" role="region" aria-label="Fund Sankey diagram; scroll horizontally on small screens" tabindex="0">
    <svg viewBox="0 0 1200 ${height}" role="img" aria-labelledby="sankey-title sankey-description" xmlns="http://www.w3.org/2000/svg">
      <title id="sankey-title">FY2025 fund Sankey: revenue, city funds, and spending</title>
      <desc id="sankey-description">Five revenue categories feed four fund groups in the middle. Separate ribbons go from those funds to seven spending areas. A red reverse link shows a negative General Fund adjustment. The two sides are independent accounting actuals.</desc>
      <defs><marker id="reverse-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 Z" fill="#b85c45"/></marker></defs>
      <text x="0" y="34" class="sankey-column-head">REVENUE SOURCES</text>
      <text x="490" y="34" class="sankey-column-head">CITY FUNDS</text>
      <text x="950" y="34" class="sankey-column-head">SPENDING AREAS</text>
      <g class="sankey-links">${revenuePaths}${spendingPaths}</g>
      <g class="sankey-nodes">${sourceNodes}${fundNodes}${useNodes}</g>
      ${reverse}
    </svg></div><div class="flow-tooltip" aria-hidden="true" hidden><strong data-tooltip-amount></strong><span data-tooltip-route></span></div>
    <figcaption>Hover over or focus a ribbon for its exact amount. Ribbon width shows the recorded amount; the red reverse link is a negative adjustment. Revenue into funds and spending out of funds are separate accounting views. On narrow screens, scroll to see the whole diagram.</figcaption></figure>`;
}
