# README.md — Inventory Highlighter Chrome Extension

## Overview
**Inventory Highlighter** is a Chrome extension (Manifest V3) that dims and labels vehicles marked as **Sold** in a Google Sheet directly on dealership inventory pages. It is designed to work on dynamic inventory sites (e.g., Luther Mazda on Dealer Inspire platform) where VINs or Stock Numbers are shown but sold vehicles may still appear online.

- Highlights sold vehicles by dimming them and adding a **Sold / Продано** badge.
- Works with both **Published CSV** and **Google Sheets API** as a data source.
- Supports infinite scroll with MutationObserver.
- Provides an Options page for configuration and a Popup for quick refresh/hide toggle.

## Features
- **VIN/Stock matching**: Cross‑checks each card’s VIN or Stock number against your Google Sheet.
- **Dim/Badge**: Sold vehicles are dimmed to ~50% opacity with a top‑right badge.
- **Hide toggle**: Optionally hide sold vehicles completely.
- **Auto refresh**: Syncs every N minutes (default: 5) + manual refresh from popup.
- **Options page**: Configure data source, column names, sold values, selectors, and behavior.
- **Popup**: Refresh data, toggle hide/show sold, see last sync time.

## Installation
1. Clone or download this repository.
2. Open Chrome → `chrome://extensions/`.
3. Enable **Developer Mode** (top right).
4. Click **Load unpacked** and select the project root folder.
5. The extension should now appear in your toolbar.

## Configuration
1. Click on the extension icon → **Options**.
2. Choose **Data Source**:
   - **Published CSV**: Publish your Google Sheet to the web → copy CSV link.
   - **Sheets API**: Enter Spreadsheet ID, Range, and API Key.
3. Configure **Columns**:
   - VIN column header (e.g., `VIN`)
   - Stock column header (e.g., `Stock`)
   - Status column header (e.g., `Status`)
   - Sold values (e.g., `Sold,SOLD,Продано,Delivered`)
4. Configure **Selectors** (if needed):
   - Vehicle card selector
   - VIN selector
   - Stock selector
   *(For Luther Mazda, defaults already target Dealer Inspire classes and data attributes.)*
5. Save settings.

## Data Source Setup
### Published CSV (simple)
1. Open Google Sheet → File → Share → Publish to web → CSV.
2. Copy the provided URL.
3. Paste into Options → CSV URL.

### Google Sheets API (advanced)
1. Enable Sheets API in Google Cloud Console.
2. Create an API key.
3. In Options, enter Spreadsheet ID, Range (e.g., `Sheet1!A1:Z1000`), and API Key.

## Usage
- Visit an inventory page (e.g., [Luther Mazda Used Vehicles](https://www.luthermazda.com/used-vehicles/)).
- Sold vehicles (as marked in your sheet) will be dimmed and labeled.
- Open the popup to:
  - **Refresh now**: Immediately sync with the sheet.
  - **Hide sold**: Toggle hiding of sold cards.
  - **Last sync time**: Shows when data was last updated.

## Styling
Injected CSS classes:
```css
.ih-sold { filter: grayscale(0.6) opacity(0.6); position: relative; }
.ih-badge { position:absolute; top:.5rem; right:.5rem; padding:.25rem .5rem; font-weight:600; border-radius:.375rem; background:#000; color:#fff; z-index:10; }
.ih-hidden { display:none !important; }
```

## Testing Checklist
- [ ] CSV & Sheets API both fetch data.
- [ ] VIN/Stock extraction works on target site.
- [ ] Infinite scroll updates properly.
- [ ] Popup refresh triggers DOM updates.
- [ ] Options persist after reload.
- [ ] Hide Sold toggle works.

## Repo Structure
```
/ (root)
  ├─ manifest.json
  ├─ README.md
  ├─ src/
  │   ├─ background.js
  │   ├─ content.js
  │   ├─ common.js
  │   ├─ styles.css
  │   ├─ options/
  │   │   ├─ index.html
  │   │   ├─ options.js
  │   └─ popup/
  │       ├─ popup.html
  │       ├─ popup.js
  └─ assets/
      └─ icon-16.png, icon-48.png, icon-128.png
```

## Notes for Luther Mazda (Dealer Inspire)
- **Allowed host**: `https://*.luthermazda.com/*`
- **Card selectors**: `.di-vehicle-card, .inventory-card, .vehicle-card, li.vehicle-card, .result-item, .vehicle, .inventory`
- **VIN selectors**: `[data-vehicle-vin], [data-vin], .vin`
- **Stock selectors**: `[data-vehicle-stock], [data-stock], .stock`
- **Regex fallback**: VIN `\b[A-HJ-NPR-Z0-9]{17}\b` | Stock `\b(?:Stock|Stk|Сток|Склад)[:#\s]*([A-Z0-9-]{4,})\b`

## License
MIT License

