# Inventory Highlighter — Chrome Extension

Inventory Highlighter dims and labels sold vehicles directly on dealership inventory pages by cross-checking VIN and Stock numbers against a Google Sheet. It supports both published CSV feeds and the Google Sheets API, and works on infinite-scroll listings.

## Features

- 🔄 **Sheet sync** – Fetches data from either a published CSV URL or the Google Sheets API.
- 🚗 **VIN / Stock matching** – Normalises VINs and stock numbers, then builds fast lookup sets.
- ✨ **Visual treatments** – Adds a `Sold` badge and dims matching vehicle cards. Optionally hides them entirely.
- ♾️ **Infinite scroll aware** – MutationObserver and debounced rescans keep lazy-loaded cards accurate.
- 🧰 **Customisable** – Options page lets you adjust column names, selectors, sold values, badge text, and refresh cadence.
- 🧭 **Popup controls** – One-click refresh, hide-sold toggle, and last-sync timestamp.

## Project Structure

```
manifest.json
src/
  background.js       # Service worker: fetches sheets & manages cache/alarms
  common.js           # Shared helpers and defaults
  content.js          # Injected on inventory pages to annotate vehicle cards
  styles.css          # Content script styling (.ih-sold, .ih-badge, .ih-hidden)
  options/
    index.html
    options.css
    options.js
  popup/
    popup.html
    popup.css
    popup.js
```

## Getting Started

1. **Download / Clone** – Grab this repository.
2. **Provide icons** – Create simple PNG icons at 16px, 48px, and 128px named `icon-16.png`, `icon-48.png`, and `icon-128.png` in an `assets/` folder if you want custom branding.
3. **Load unpacked** – In Chrome visit `chrome://extensions`, enable Developer Mode, click **Load unpacked**, and pick this folder.
4. **Configure options** – Right-click the extension → **Options**. Fill in your data source and selectors (see below).
5. **Visit an inventory page** – The extension will dim and label sold vehicles automatically.

## Data Source Setup

### Option A: Published CSV (recommended for simplicity)

1. Open your Google Sheet.
2. Choose **File → Share → Publish to web** and select **Comma-separated values (.csv)**.
3. Copy the generated URL.
4. Paste it into **Options → Published CSV URL**.

### Option B: Google Sheets API (for private sheets)

1. Enable the Google Sheets API in [Google Cloud Console](https://console.cloud.google.com/apis/library/sheets.googleapis.com).
2. Create an API key (restrict it to the Sheets API if possible).
3. Note your Spreadsheet ID (from the sheet URL) and the range containing your data, e.g. `Sheet1!A1:C500`.
4. In Options fill **Spreadsheet ID**, **Range**, and **API Key**. Leave CSV URL blank.

## Configuring Columns & Status Values

Your sheet must contain the VIN, Stock, and Status columns (case-insensitive). Match the column headers in Options. Add all possible sold-status strings (comma-separated) such as:

```
Sold,SOLD,Delivered,Продано
```

Rows whose status matches any of these values will be treated as sold.

## Selector Customisation

By default the extension targets many Dealer Inspire–style layouts:

- Card selector: `.vehicle-card, .inventory-card, .result-item, .vehicle`
- VIN selector: `[data-vehicle-vin], [data-vin], .vin`
- Stock selector: `[data-vehicle-stock], [data-stock], .stock`

If your site uses different markup, update the selectors in Options. Use CSS selectors that resolve relative to each vehicle card.

## Popup Controls

- **Refresh now** – Forces a data fetch via the background service worker.
- **Hide sold** – Toggles visibility of matched cards (persists per browser profile).
- **Last sync** – Displays the timestamp of the last successful fetch.

## Styling Hooks

- `.ih-sold` – Applied to sold cards (dims via filter).
- `.ih-badge` – Badge element appended inside the card.
- `.ih-hidden` – Applied when hide-sold is enabled.

You can override these classes with custom CSS using a user style manager if desired.

## Permissions

- `storage` – Save configuration and cached sheet data.
- `alarms` – Schedule periodic refreshes.
- `host_permissions` – Default includes Google Sheets endpoints and `<all_urls>` for the content script. Restrict hosts before publishing to the Chrome Web Store.

## Testing Checklist

- [ ] Options save and reload correctly.
- [ ] CSV fetch works with a demo sheet (VIN `JM3KK1WY0R1100001`, Status `Sold`).
- [ ] Sheets API fetch works with API credentials.
- [ ] Visiting an inventory page dims/badges sold vehicles.
- [ ] Lazy-loaded cards are annotated after scrolling.
- [ ] Popup **Refresh now** updates last sync without reloading the page.
- [ ] Hide sold toggle in the popup hides/unhides cards instantly.

## Packaging & Deployment

1. Update **host_permissions** in `manifest.json` to the exact dealership domains you support.
2. Run through the testing checklist above.
3. Add your own PNG icons (16/48/128px) before publishing, then zip the entire folder and upload to the Chrome Web Store developer dashboard.

## License

MIT License.
