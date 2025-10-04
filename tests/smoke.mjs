import assert from 'assert/strict';
import {
  parseCsv,
  buildLookups,
  normalizeStock,
  DEFAULT_SETTINGS
} from '../src/common.js';

const sampleCsv = `Stock,Comment\nSTK-001,sold\nSTK-002,available`;

const rows = parseCsv(sampleCsv);
assert.equal(rows.length, 2, 'CSV parser should return 2 data rows');
assert.equal(rows[0].Stock, 'STK-001');
assert.equal(rows[1].Comment, 'available');

const { vinSet, stockSet } = buildLookups(rows, {
  columns: DEFAULT_SETTINGS.columns,
  soldValues: ['sold']
});

assert.equal(vinSet.size, 0, 'VIN lookup should remain empty when no VIN column is configured.');
assert(stockSet.has(normalizeStock('STK-001')),
  'Stock lookup should include sold stock');
assert(!stockSet.has(normalizeStock('STK-002')),
  'Stock lookup should not include available stock');

console.log('Smoke test passed: CSV parsing and lookup generation work as expected.');
