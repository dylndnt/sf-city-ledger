export const spendingLevels = [
  { name: 'Spending area', code: 'organizationGroupCode', label: 'organizationGroup' },
  { name: 'Department', code: 'departmentCode', label: 'department' },
  { name: 'Program', code: 'programCode', label: 'program' },
  { name: 'Spending type', code: 'characterCode', label: 'character' },
  { name: 'Object', code: 'objectCode', label: 'object' },
  { name: 'Sub-object', code: 'subObjectCode', label: 'subObject' },
];

const scorecardDepartments = {
  CON: 'Controller', DEM: 'Emergency Management', ENV: 'Environment',
  FIR: 'Fire Department', HOM: 'Homelessness And Supportive Housing',
  HSA: 'Human Services', MTA: 'Municipal Transportation Agency',
  POL: 'Police', DPH: 'Public Health', LIB: 'Public Library',
  PUC: 'Public Utilities Commission', DPW: 'Public Works',
  REC: 'Recreation And Park Commission', SHF: 'Sheriff',
};

export function drilldown(data, group = 'All city funds', fundCode = '', path = []) {
  if (path.length > spendingLevels.length) throw new Error('invalid spending path');
  const eligibleFunds = new Set(data.funds
    .filter(fund => (group === 'All city funds' || fund.fundGroup === group)
      && (!fundCode || fund.fundCode === fundCode))
    .map(fund => fund.fundCode));
  const rows = data.spendingDetails.filter(row => eligibleFunds.has(row.fundCode)
    && path.every((code, index) => row[spendingLevels[index].code] === code));
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const level = spendingLevels[path.length] ?? null;
  const entries = new Map();
  if (level) for (const row of rows) {
    const code = row[level.code];
    const item = entries.get(code) ?? { code, label: row[level.label] || 'Unspecified', amount: 0 };
    item.amount += row.amount;
    entries.set(code, item);
  }
  const breadcrumbs = path.map((code, index) => ({
    code, label: rows[0]?.[spendingLevels[index].label] || code,
  }));
  return {
    total, level, breadcrumbs,
    entries: [...entries.values()].sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label)),
    departmentCode: path[1] || '',
    department: rows[0]?.department || '',
  };
}

export function compareSpending(current, previous, group = 'All city funds', fundCode = '', path = []) {
  const selected = drilldown(current, group, fundCode, path);
  const hasPriorScope = previous && previous.funds.some(fund =>
    (group === 'All city funds' || fund.fundGroup === group) && (!fundCode || fund.fundCode === fundCode));
  if (!hasPriorScope) return { ...selected, previous: null, change: null,
    entries: selected.entries.map(entry => ({ ...entry, previous: null, change: null })) };
  const earlier = drilldown(previous, group, fundCode, path);
  const previousByCode = new Map(earlier.entries.map(entry => [entry.code, entry.amount]));
  return { ...selected, previous: earlier.total, change: selected.total - earlier.total,
    entries: selected.entries.map(entry => {
      const prior = previousByCode.get(entry.code) ?? 0;
      return { ...entry, previous: prior, change: entry.amount - prior };
    }) };
}

const quoted = value => `'${String(value).replaceAll("'", "''")}'`;
const resource = (id, query) => `https://data.sf.gov/resource/${id}.json?$query=${encodeURIComponent(query)}`;

function vendorFilters(fiscalYear, path, fundCode, fundTypeCodes) {
  if (path.length !== spendingLevels.length) throw new Error('select a sub-object first');
  const where = [
    `fiscal_year=${quoted(fiscalYear)}`, "related_govt_units='NO'",
    ...path.map((code, index) => `${[
      'organization_group_code', 'department_code', 'program_code',
      'character_code', 'object_code', 'sub_object_code',
    ][index]}=${quoted(code)}`),
  ];
  if (fundCode) where.push(`fund_code=${quoted(fundCode)}`);
  if (fundTypeCodes.length === 1) where.push(`fund_type_code=${quoted(fundTypeCodes[0])}`);
  if (fundTypeCodes.length > 1) where.push(`fund_type_code IN(${fundTypeCodes.map(quoted).join(',')})`);
  where.push('vouchers_paid IS NOT NULL', 'vouchers_paid != 0');
  return where;
}

export function vendorUrl(fiscalYear, path, fundCode = '', offset = 0, fundTypeCodes = []) {
  const where = vendorFilters(fiscalYear, path, fundCode, fundTypeCodes);
  const query = `SELECT vendor, sum(vouchers_paid) AS paid, max(data_as_of) AS as_of WHERE ${where.join(' AND ')} AND vendor IS NOT NULL GROUP BY vendor ORDER BY paid DESC LIMIT 51 OFFSET ${offset}`;
  return resource('n9pm-xkyq', query);
}

export function vendorDetailUrl(fiscalYear, path, vendor, fundCode = '', offset = 0, fundTypeCodes = []) {
  const where = vendorFilters(fiscalYear, path, fundCode, fundTypeCodes);
  where.push(`vendor=${quoted(vendor)}`);
  const query = `SELECT voucher, purchase_order, contract_number, contract_title, vouchers_paid, data_as_of WHERE ${where.join(' AND ')} ORDER BY vouchers_paid DESC LIMIT 51 OFFSET ${offset}`;
  return resource('n9pm-xkyq', query);
}

export function vendorPriorUrl(fiscalYear, path, vendor, fundCode = '', fundTypeCodes = []) {
  const where = vendorFilters(String(Number(fiscalYear) - 1), path, fundCode, fundTypeCodes);
  where.push(`vendor=${quoted(vendor)}`);
  return resource('n9pm-xkyq', `SELECT sum(vouchers_paid) AS paid WHERE ${where.join(' AND ')}`);
}

export function outcomeUrl(fiscalYear, departmentCode) {
  const department = scorecardDepartments[departmentCode];
  if (!department) return null;
  const start = Number(fiscalYear) - 2;
  const query = `SELECT measure_code, department, goal, measure_title, measure_description, measure_methodology, calendar_month, actual, target, measure_data_type, data_as_of WHERE department=${quoted(department)} AND calendar_month between '${start}-07-01T00:00:00' and '${fiscalYear}-06-30T23:59:59' AND actual IS NOT NULL AND actual != -9999 ORDER BY calendar_month DESC LIMIT 5000`;
  return resource('kc49-udxn', query);
}

export function latestOutcomes(rows, fiscalYear = null) {
  const latest = new Map();
  for (const row of [...rows].sort((a, b) => b.calendar_month.localeCompare(a.calendar_month))) {
    if (Number(row.actual) === -9999) continue;
    const year = Number(row.calendar_month.slice(0, 4));
    const month = Number(row.calendar_month.slice(5, 7));
    const observationYear = month >= 7 ? year + 1 : year;
    if (!fiscalYear) {
      if (!latest.has(row.measure_code)) latest.set(row.measure_code, row);
      continue;
    }
    if (observationYear !== Number(fiscalYear) && observationYear !== Number(fiscalYear) - 1) continue;
    const key = `${row.measure_code}:${observationYear}`;
    if (!latest.has(key)) latest.set(key, row);
  }
  if (!fiscalYear) return [...latest.values()].sort((a, b) => (a.measure_title || '').localeCompare(b.measure_title || ''));
  return [...latest.entries()].filter(([key]) => key.endsWith(`:${fiscalYear}`)).map(([key, row]) => ({
    ...row, previous: latest.get(`${row.measure_code}:${Number(fiscalYear) - 1}`) ?? null,
  })).sort((a, b) => (a.measure_title || '').localeCompare(b.measure_title || ''));
}
