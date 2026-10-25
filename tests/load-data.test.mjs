import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSnapshots } from '../public/load-data.mjs';

test('malformed optional prior year leaves the current chart available', async () => {
  const fetcher = async url => url.includes('2025')
    ? { ok: true, json: async () => ({ fiscalYear: '2025', funds: [] }) }
    : { ok: true, json: async () => { throw new SyntaxError('invalid JSON'); } };
  const result = await loadSnapshots(fetcher);
  assert.equal(result.data.fiscalYear, '2025');
  assert.equal(result.previousData, null);
});
