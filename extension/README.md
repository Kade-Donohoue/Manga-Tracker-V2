# Manga Tracker Extension

A browser extension for tracking manga chapters across multiple reading platforms. Integrates with the Manga Tracker backend to sync reading progress and manage your manga library.

## Features

- Track manga across multiple platforms (Asura, Comix, Mangadex, Mangafire, Manganato, and more)
- Sync reading progress with your Manga Tracker account
- Get notifications when new chapters are available
- Manage your manga collection directly from the extension
- Support for both Chrome and Firefox

## Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** (recommended) or npm
- A modern browser (Chrome or Firefox)

## Installation

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
   - Copy `.env.example` to `.env.local` (if it exists)
   - Set `VITE_BACKEND_URL` to your backend server URL (e.g., `https://your-backend.com`)

## Building

### Development Mode

Watch for changes and rebuild automatically:
```bash
pnpm dev
```

This will continuously rebuild the extension as you modify files and output to the `dist/` directory.

### Build for Chrome

```bash
pnpm build:chrome
```

Output: `dist/` directory with Chrome-compatible manifest

### Build for Firefox

```bash
pnpm build:firefox
```

Output: `dist/` directory with Firefox-compatible manifest

### Build for Both Browsers (Production)

```bash
pnpm build:all
```

This will:
1. Build for Chrome → `build/chrome/`
2. Build for Firefox → `build/firefox/`
3. Generate `tomari-chrome-extension.zip`
4. Generate `tomari-firefox-extension.zip`

## Loading the Extension

### Chrome

1. Open `chrome://extensions/` in your browser
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist/` directory
5. The extension should now appear in your extensions list

### Firefox

1. Open `about:debugging#/runtime/this-firefox` in your browser
2. Click "Load Temporary Add-on"
3. Select any file from the `dist/` directory
4. The extension should now appear in your extensions list

## Project Structure

```
extension/
├── src/
│   ├── background/       # Background service worker script
│   ├── content/          # Content script for page interactions
│   ├── popup/            # Popup UI script
│   ├── core/             # Core functionality
│   │   ├── types.ts      # Type definitions
│   │   ├── readingCompletion.ts
│   │   ├── waitForElement.ts
│   │   └── trackers/     # Site-specific tracking logic
│   ├── shared/           # Shared utilities
│   │   ├── logger.ts
│   │   └── messaging.ts
│   └── sites/            # Site detection and parsers
├── public/
│   ├── manifest.json     # Chrome manifest
│   ├── manifest.firefox.json  # Firefox manifest
│   ├── popup.html        # Popup UI
│   └── icons/            # Extension icons
├── dist/                 # Built extension (generated)
├── build/                # Production builds (generated)
├── vite.config.ts        # Vite build configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Watch mode - rebuild on file changes |
| `pnpm build` | Build for Chrome (default) |
| `pnpm build:chrome` | Build for Chrome explicitly |
| `pnpm build:firefox` | Build for Firefox |
| `pnpm build:all` | Build for both browsers and create ZIP files |

### File Organization

- **Background Script** (`src/background/index.ts`): Handles extension messages, API calls, and state management
- **Content Script** (`src/content/index.ts`): Injects into manga websites to track reading progress
- **Popup Script** (`src/popup/index.ts`): Manages the popup UI and user interactions

### Manifest Files

- `public/manifest.json` - Chrome manifest (MV3)
- `public/manifest.firefox.json` - Firefox manifest (MV2/MV3 compatible)

## Configuration

### Environment Variables

Create a `.env.local` file with:

```env
VITE_BACKEND_URL=https://your-backend.com
```

This will be replaced in the build process via Vite's environment handling.

## Supported Manga Sites

The extension currently supports:
- Asura Scans
- Comix
- Mangadex
- Mangafire
- Manganato
- End Level (generic parser)

## Troubleshooting

### Extension doesn't load
1. Make sure you've run `pnpm build` or `pnpm build:chrome`
2. Check that the `dist/` directory exists and contains `manifest.json`
3. Try reloading the extension in browser settings

### Changes not appearing
1. Run `pnpm dev` to rebuild with your changes
2. In browser extensions page, click the reload icon for the extension
3. Hard refresh the manga website (Ctrl+Shift+R or Cmd+Shift+R)

### Content script not injecting
1. Check that the website URL matches the patterns in `manifest.json`
2. Hard refresh the page
3. Check browser console for errors (Ctrl+Shift+J)

### API calls failing
1. Verify `VITE_BACKEND_URL` is set correctly
2. Check that your backend server is running
3. Check browser console for CORS errors
4. Ensure you're authenticated with your Manga Tracker account

## Publishing

### Chrome Web Store
1. Create a `.zip` of the `dist/` directory
2. Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Fill in required store listing information
4. Submit for review

### Firefox Add-ons Store
1. Create a `.zip` of the `dist/` directory (already created by `pnpm build:all`)
2. Sign in to [Firefox Add-ons Developer](https://addons.mozilla.org/en-US/developers/)
3. Upload the `.zip` file
4. Fill in required store listing information
5. Submit for review

## License

[Your License Here]
