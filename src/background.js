import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  buildLookups,
  createStatusMessage,
  getSettings,
  saveCache,
  parseCsv
} from './common.js';

const ALARM_NAME = 'ih_refresh_alarm';

chrome.runtime.onInstalled.addListener(async () => {
  await ensureAlarm();
  await refreshData();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureAlarm();
  await refreshData();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await refreshData();
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
    await refreshData();
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
    const { vinSet, stockSet } = buildLookups(rows, settings);
    const lastSync = Date.now();
    await saveCache({ vins: vinSet, stocks: stockSet, lastSync });
    chrome.runtime.sendMessage({ type: 'ih_cache_updated', lastSync }).catch(() => {});
    return { lastSync, count: rows.length };
  } catch (error) {
    console.error('Inventory Highlighter refresh failed', error);
    return { error: createStatusMessage(error) };
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
  const [headers, ...rows] = data.values || [];
  if (!headers) return [];
  return rows.map((values) => {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] || '').trim();
    });
    return row;
  });
}
