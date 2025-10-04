import assert from 'node:assert/strict';
import { extractStockValue } from '../src/common.js';

const result = extractStockValue('Stock: 28996B');
assert.equal(result, '28996B', 'Stock labels should be removed before normalization');

console.log('Smoke tests passed.');
