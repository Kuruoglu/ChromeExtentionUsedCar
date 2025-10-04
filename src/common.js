// Common utilities shared by background, content, popup, and options scripts.

export const DEFAULT_SETTINGS = {
  dataSource: 'csv', // 'csv' or 'sheets'
  csvUrl: '',
  sheets: {
    spreadsheetId: '',
    range: 'Sheet1!A:G',
    apiKey: ''
  },
  columns: {
    vin: '',
    stock: 'Stock',
    status: 'Comment'
  },
  soldValues: ['sold'],
  selectors: {
    card: '.result-wrap.used-vehicle.stat-image-link',
    vin: '',
    stock: '.stock-row'
  },
  badgeText: 'Sold',
  hideSold: false,
  autoRefreshMinutes: 5
};

export const STORAGE_KEYS = {
  SETTINGS: 'ih_settings',
  CACHE: 'ih_cache',
  LAST_SYNC: 'ih_last_sync',
  HIDE_SOLD: 'ih_hide_sold'
};

export function normalizeVin(vin = '') {
  return vin
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/[IOQ]/g, '');
}

export function normalizeStock(stock = '') {
  return stock.trim().toUpperCase();
}

export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const row = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] || '').trim();
    });
    return row;
  });
}

export async function getSettings() {
  const { [STORAGE_KEYS.SETTINGS]: stored } = await chrome.storage.sync.get({
    [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS
  });
  return { ...DEFAULT_SETTINGS, ...stored, sheets: { ...DEFAULT_SETTINGS.sheets, ...(stored?.sheets || {}) }, columns: { ...DEFAULT_SETTINGS.columns, ...(stored?.columns || {}) }, selectors: { ...DEFAULT_SETTINGS.selectors, ...(stored?.selectors || {}) } };
}

export async function saveSettings(settings) {
  await chrome.storage.sync.set({
    [STORAGE_KEYS.SETTINGS]: settings
  });
}

export async function getCache() {
  const result = await chrome.storage.local.get({
    [STORAGE_KEYS.CACHE]: { vins: [], stocks: [] },
    [STORAGE_KEYS.LAST_SYNC]: 0
  });
  return {
    vins: new Set(result[STORAGE_KEYS.CACHE]?.vins || []),
    stocks: new Set(result[STORAGE_KEYS.CACHE]?.stocks || []),
    lastSync: result[STORAGE_KEYS.LAST_SYNC] || 0
  };
}

export async function saveCache({ vins, stocks, lastSync }) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.CACHE]: {
      vins: Array.from(vins || []),
      stocks: Array.from(stocks || [])
    },
    [STORAGE_KEYS.LAST_SYNC]: lastSync || Date.now()
  });
}

export async function getHideSold() {
  const { [STORAGE_KEYS.HIDE_SOLD]: hideSold } = await chrome.storage.local.get({
    [STORAGE_KEYS.HIDE_SOLD]: null
  });
  if (hideSold === null || hideSold === undefined) {
    const settings = await getSettings();
    return settings.hideSold;
  }
  return hideSold;
}

export async function setHideSold(value) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.HIDE_SOLD]: value
  });
}

export function buildLookups(rows, { columns, soldValues }) {
  const soldStatuses = new Set(soldValues.map((s) => s.trim().toUpperCase()).filter(Boolean));
  const vinSet = new Set();
  const stockSet = new Set();
  const vinKey = (columns?.vin || '').trim();
  const stockKey = (columns?.stock || '').trim();
  const statusKey = (columns?.status || '').trim();
  if (!statusKey || !stockKey) {
    return { vinSet, stockSet };
  }
  rows.forEach((row) => {
    const statusValue = (row[statusKey] || '').trim().toUpperCase();
    if (!soldStatuses.has(statusValue)) return;
    if (vinKey) {
      const vin = normalizeVin(row[vinKey] || '');
      if (vin) vinSet.add(vin);
    }
    const stock = normalizeStock(row[stockKey] || '');
    if (stock) stockSet.add(stock);
  });
  return { vinSet, stockSet };
}

export function createStatusMessage(error) {
  if (!error) return 'OK';
  if (error.message) return error.message;
  try {
    return JSON.stringify(error);
  } catch (jsonError) {
    return String(error);
  }
}

export function debounce(fn, delay) {
  let timer = null;
  return function debounced(...args) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

export function formatTime(timestamp) {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleString();
}
