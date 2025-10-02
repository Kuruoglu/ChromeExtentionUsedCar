(async () => {
  const {
    STORAGE_KEYS,
    getCache,
    getSettings,
    getHideSold,
    setHideSold,
    normalizeVin,
    normalizeStock,
    debounce
  } = await import(chrome.runtime.getURL('src/common.js'));

  let settings = await getSettings();
  let { vins, stocks } = await getCache();
  let hideSold = await getHideSold();

  const VIN_REGEX = /\b[A-HJ-NPR-Z0-9]{17}\b/;

  const processCards = debounce(() => {
    applyToCards(document);
  }, 100);

  function applyToCards(root) {
    const cardSelector = settings.selectors?.card || '';
    if (!cardSelector) return;
    const cards = root.querySelectorAll(cardSelector);
    cards.forEach((card) => {
      try {
        annotateCard(card);
      } catch (error) {
        console.debug('Inventory Highlighter card error', error);
      }
    });
  }

  function annotateCard(card) {
    const vin = extractVin(card);
    const stock = extractStock(card);
    const isSold = Boolean((vin && vins.has(vin)) || (stock && stocks.has(stock)));
    toggleCardState(card, isSold);
  }

  function extractTextBySelector(card, selector) {
    if (!selector) return '';
    const el = card.querySelector(selector);
    if (!el) return '';
    return el.textContent || '';
  }

  function extractVin(card) {
    const fromSelector = extractTextBySelector(card, settings.selectors?.vin);
    const normalized = normalizeVin(fromSelector);
    if (normalized) return normalized;
    const fallback = card.textContent || '';
    const match = fallback.match(VIN_REGEX);
    return match ? normalizeVin(match[0]) : '';
  }

  function extractStock(card) {
    const fromSelector = extractTextBySelector(card, settings.selectors?.stock);
    if (fromSelector) {
      const normalized = normalizeStock(fromSelector);
      if (normalized) return normalized;
    }
    const fallback = card.textContent || '';
    const stockMatch = fallback.match(/\b(?:STOCK|STK|SKU|Склад|Сток)[:#\s]*([A-Z0-9-]{4,})\b/i);
    return stockMatch ? normalizeStock(stockMatch[1]) : '';
  }

  function toggleCardState(card, isSold) {
    const badgeText = settings.badgeText || 'Sold';
    if (isSold) {
      card.classList.add('ih-sold');
      if (hideSold) {
        card.classList.add('ih-hidden');
      } else {
        card.classList.remove('ih-hidden');
      }
      let badge = card.querySelector('.ih-badge');
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'ih-badge';
        badge.setAttribute('aria-label', badgeText);
        card.appendChild(badge);
      }
      badge.textContent = badgeText;
    } else {
      card.classList.remove('ih-sold', 'ih-hidden');
      const badge = card.querySelector('.ih-badge');
      if (badge) {
        badge.remove();
      }
    }
  }

  function refreshSettings() {
    getSettings().then((nextSettings) => {
      settings = nextSettings;
      processCards();
    });
  }

  function refreshCache() {
    getCache().then((cache) => {
      vins = cache.vins;
      stocks = cache.stocks;
      processCards();
    });
  }

  function updateHideSold(value) {
    hideSold = value;
    document.querySelectorAll(settings.selectors?.card || '').forEach((card) => {
      if (card.classList.contains('ih-sold')) {
        if (hideSold) {
          card.classList.add('ih-hidden');
        } else {
          card.classList.remove('ih-hidden');
        }
      }
    });
  }

  const observer = new MutationObserver((mutations) => {
    let shouldProcess = false;
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        shouldProcess = true;
      }
    });
    if (shouldProcess) {
      processCards();
    }
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });

  processCards();

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'ih_cache_updated') {
      refreshCache();
    }
    if (message?.type === 'ih_hide_sold_toggled') {
      updateHideSold(Boolean(message.value));
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes[STORAGE_KEYS.SETTINGS]) {
      refreshSettings();
    }
    if (areaName === 'local' && changes[STORAGE_KEYS.HIDE_SOLD]) {
      updateHideSold(changes[STORAGE_KEYS.HIDE_SOLD].newValue);
    }
  });

  if (hideSold !== settings.hideSold) {
    setHideSold(hideSold).catch(() => {});
  }
})();
