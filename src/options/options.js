import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  setHideSold
} from '../common.js';

const form = document.getElementById('options-form');
const statusEl = document.getElementById('status');

init();

async function init() {
  const settings = await getSettings();
  populateForm(settings);
}

function populateForm(settings) {
  const dataSource = settings.dataSource || DEFAULT_SETTINGS.dataSource;
  form.elements['dataSource'].value = dataSource;
  form.querySelectorAll("input[name='dataSource']").forEach((input) => {
    input.checked = input.value === dataSource;
  });
  form.elements['csvUrl'].value = settings.csvUrl || '';
  form.elements['spreadsheetId'].value = settings.sheets?.spreadsheetId || '';
  form.elements['range'].value = settings.sheets?.range || '';
  form.elements['apiKey'].value = settings.sheets?.apiKey || '';

  form.elements['vinColumn'].value = settings.columns?.vin || DEFAULT_SETTINGS.columns.vin;
  form.elements['stockColumn'].value = settings.columns?.stock || DEFAULT_SETTINGS.columns.stock;
  form.elements['statusColumn'].value = settings.columns?.status || DEFAULT_SETTINGS.columns.status;
  form.elements['soldValues'].value = (settings.soldValues || []).join(',');

  form.elements['cardSelector'].value = settings.selectors?.card || DEFAULT_SETTINGS.selectors.card;
  form.elements['vinSelector'].value = settings.selectors?.vin || DEFAULT_SETTINGS.selectors.vin;
  form.elements['stockSelector'].value = settings.selectors?.stock || DEFAULT_SETTINGS.selectors.stock;

  form.elements['badgeText'].value = settings.badgeText || DEFAULT_SETTINGS.badgeText;
  form.elements['autoRefresh'].value = settings.autoRefreshMinutes || DEFAULT_SETTINGS.autoRefreshMinutes;
  form.elements['hideSold'].checked = Boolean(settings.hideSold);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const dataSource = formData.get('dataSource') || DEFAULT_SETTINGS.dataSource;
  const csvUrl = formData.get('csvUrl')?.trim();
  const sheets = {
    spreadsheetId: formData.get('spreadsheetId')?.trim() || '',
    range: formData.get('range')?.trim() || '',
    apiKey: formData.get('apiKey')?.trim() || ''
  };
  const columns = {
    vin: formData.get('vinColumn')?.trim() || DEFAULT_SETTINGS.columns.vin,
    stock: formData.get('stockColumn')?.trim() || DEFAULT_SETTINGS.columns.stock,
    status: formData.get('statusColumn')?.trim() || DEFAULT_SETTINGS.columns.status
  };
  const soldValues = (formData.get('soldValues') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const selectors = {
    card: formData.get('cardSelector')?.trim() || DEFAULT_SETTINGS.selectors.card,
    vin: formData.get('vinSelector')?.trim() || DEFAULT_SETTINGS.selectors.vin,
    stock: formData.get('stockSelector')?.trim() || DEFAULT_SETTINGS.selectors.stock
  };
  const badgeText = formData.get('badgeText')?.trim() || DEFAULT_SETTINGS.badgeText;
  const autoRefreshMinutes = Math.max(1, Number(formData.get('autoRefresh')) || DEFAULT_SETTINGS.autoRefreshMinutes);
  const hideSold = formData.get('hideSold') === 'on';

  const settings = {
    dataSource,
    csvUrl,
    sheets,
    columns,
    soldValues,
    selectors,
    badgeText,
    autoRefreshMinutes,
    hideSold
  };

  await saveSettings(settings);
  await setHideSold(hideSold);
  await chrome.runtime.sendMessage({ type: 'ih_settings_updated' }).catch(() => {});
  statusEl.textContent = 'Saved!';
  setTimeout(() => {
    statusEl.textContent = '';
  }, 2000);
});

form.querySelectorAll("input[name='dataSource']").forEach((input) => {
  input.addEventListener('change', () => {
    form.elements['dataSource'].value = input.value;
  });
});
