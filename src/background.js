import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  buildLookups,
  createStatusMessage,
  getSettings,
  saveCache,
  parseCsv,
  getRequiredColumns
} from './common.js';

const ALARM_NAME = 'ih_refresh_alarm';

chrome.runtime.onInstalled.addListener(async () => {
  await ensureAlarm();
  try {
    await refreshData();
  } catch (error) {
    console.error('Inventory Highlighter initial refresh failed', error);
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureAlarm();
  try {
    await refreshData();
  } catch (error) {
    console.error('Inventory Highlighter startup refresh failed', error);
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    try {
      await refreshData();
    } catch (error) {
      console.error('Inventory Highlighter scheduled refresh failed', error);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'ih_refresh_now') {
    refreshData()
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((error) => sendResponse({ success: false, error: createStatusMessage(error) }));
    return true;
  }
  if (message?.type === 'ih_get_last_sync') {
    chrome.storage.local
      .get({ [STORAGE_KEYS.LAST_SYNC]: 0 })
      .then((result) => sendResponse({ lastSync: result[STORAGE_KEYS.LAST_SYNC] || 0 }))
      .catch((error) => sendResponse({ lastSync: 0, error: createStatusMessage(error) }));
    return true;
  }
  return undefined;
});

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'sync' && changes[STORAGE_KEYS.SETTINGS]) {
    await ensureAlarm();
    try {
      await refreshData();
    } catch (error) {
      console.error('Inventory Highlighter refresh after settings change failed', error);
    }
  }
});

async function ensureAlarm() {
  const settings = await getSettings();
  const minutes = Math.max(1, Number(settings.autoRefreshMinutes) || DEFAULT_SETTINGS.autoRefreshMinutes);
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (existing) {
    await chrome.alarms.clear(ALARM_NAME);
  }
  await chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: minutes,
    delayInMinutes: 0.1
  });
}

async function refreshData() {
  const settings = await getSettings();
  const { dataSource } = settings;
  try {
    const rows = await fetchRows(settings, dataSource);
    assertColumnsPresent(rows, settings);
    const { vinSet, stockSet } = buildLookups(rows, settings);
    const lastSync = Date.now();
    await saveCache({ vins: vinSet, stocks: stockSet, lastSync });
    chrome.runtime.sendMessage({ type: 'ih_cache_updated', lastSync }).catch(() => {});
    return { lastSync, count: rows.length };
  } catch (error) {
    const message = createStatusMessage(error);
    console.error('Inventory Highlighter refresh failed', error);
    throw new Error(message);
  }
}

async function fetchRows(settings, dataSource) {
  if (dataSource === 'sheets') {
    return fetchFromSheets(settings);
  }
  return fetchFromCsv(settings);
}

async function fetchFromCsv(settings) {
  if (!settings.csvUrl) {
    throw new Error('CSV URL is not configured.');
  }
  const response = await fetch(settings.csvUrl, {
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(`CSV request failed: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  return parseCsv(text);
}

async function fetchFromSheets(settings) {
  const { sheets } = settings;
  if (!sheets.spreadsheetId || !sheets.range || !sheets.apiKey) {
    throw new Error('Sheets API requires Spreadsheet ID, Range, and API Key.');
  }
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${sheets.spreadsheetId}/values/${encodeURIComponent(sheets.range)}`);
  url.searchParams.set('key', sheets.apiKey);
  const response = await fetch(url.toString(), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Sheets API request failed: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  const [rawHeaders, ...rows] = data.values || [];
  if (!rawHeaders) return [];
  const headers = rawHeaders.map((header) => (header || '').trim());
  const missing = missingColumns(headers, settings);
  if (missing.length) {
    throw new Error(
      `Configured columns were not found in the selected range. Include the header row with: ${missing.join(', ')}`
    );
  }
  return rows.map((values) => {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] || '').trim();
    });
    return row;
  });
}

function missingColumns(headers, settings) {
  const required = getRequiredColumns(settings);
  const normalized = headers.map((header) => header.trim());
  return required.filter((column) => !normalized.includes(column));
}

function assertColumnsPresent(rows, settings) {
  const required = getRequiredColumns(settings);
  if (!required.length) {
    throw new Error('Configure at least Stock and Status column names before refreshing.');
  }
  const sampleRow = rows.find((row) => row && typeof row === 'object');
  if (!sampleRow) {
    return;
  }
  const missing = required.filter((column) => !Object.prototype.hasOwnProperty.call(sampleRow, column));
  if (missing.length) {
    throw new Error(
      `Configured columns were not found in the data. Check your headers and range for: ${missing.join(', ')}`
    );
  }
}
