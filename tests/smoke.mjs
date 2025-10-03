import assert from 'assert/strict';
import {
  parseCsv,
  buildLookups,
  normalizeVin,
  normalizeStock,
  DEFAULT_SETTINGS
} from '../src/common.js';

const sampleCsv = `VIN,Stock,Status\nJM3KK1WY0R1100001,STK-001,Sold\n1HGCM82633A004352,STK-002,Available`;

const rows = parseCsv(sampleCsv);
assert.equal(rows.length, 2, 'CSV parser should return 2 data rows');
assert.equal(rows[0].VIN, 'JM3KK1WY0R1100001');
assert.equal(rows[1].Status, 'Available');

const { vinSet, stockSet } = buildLookups(rows, {
  columns: DEFAULT_SETTINGS.columns,
  soldValues: ['Sold']
});

assert(vinSet.has(normalizeVin('JM3KK1WY0R1100001')),
  'VIN lookup should include sold VIN');
assert(!vinSet.has(normalizeVin('1HGCM82633A004352')),
  'VIN lookup should not include available VIN');
assert(stockSet.has(normalizeStock('STK-001')),
  'Stock lookup should include sold stock');

console.log('Smoke test passed: CSV parsing and lookup generation work as expected.');
