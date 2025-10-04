import assert from 'node:assert/strict';
import { extractStockValue, normalizeStock } from '../src/common.js';

const rawStock = 'Stock: 28996B';
const normalized = normalizeStock(extractStockValue(rawStock));

assert.equal(normalized, '28996B', 'stock label should be stripped before normalization');

console.log('Smoke tests passed');
