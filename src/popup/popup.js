import {
  getCache,
  getHideSold,
  setHideSold,
  formatTime
} from '../common.js';

const refreshButton = document.getElementById('refresh');
const hideSoldToggle = document.getElementById('hideSold');
const lastSyncEl = document.getElementById('lastSync');
const messageEl = document.getElementById('message');

init();

async function init() {
  const hideSold = await getHideSold();
  hideSoldToggle.checked = Boolean(hideSold);
  await updateLastSync();
}

refreshButton.addEventListener('click', async () => {
  setBusy(true, 'Refreshing…');
  try {
    const response = await chrome.runtime.sendMessage({ type: 'ih_refresh_now' });
    if (response?.success) {
      await updateLastSync(response.lastSync);
      setBusy(false, `Synced ${new Date(response.lastSync).toLocaleTimeString()}`);
    } else {
      throw new Error(response?.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Inventory Highlighter refresh failed', error);
    setBusy(false, error.message || 'Refresh failed');
  }
});

hideSoldToggle.addEventListener('change', async (event) => {
  const value = event.target.checked;
  await setHideSold(value);
  messageEl.textContent = value ? 'Sold vehicles hidden' : 'Sold vehicles visible';
  setTimeout(() => {
    messageEl.textContent = '';
  }, 2000);
});

async function updateLastSync(forceValue) {
  if (forceValue) {
    lastSyncEl.textContent = formatTime(forceValue);
    return;
  }
  const cache = await getCache();
  lastSyncEl.textContent = formatTime(cache.lastSync);
}

function setBusy(isBusy, message) {
  refreshButton.disabled = isBusy;
  refreshButton.textContent = isBusy ? 'Refreshing…' : 'Refresh now';
  if (message) {
    messageEl.textContent = message;
  } else {
    messageEl.textContent = '';
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'ih_cache_updated') {
    updateLastSync(message.lastSync);
  }
});
