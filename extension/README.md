# Manga Tracker Extension

A Plasmo browser extension for tracking manga chapters across supported reading platforms. It uses Better Auth to connect to the Manga Tracker backend and sync reading progress.

## Prerequisites

- Node.js 18 or newer
- pnpm
- Chrome or Firefox

## Installation

From this directory:

```bash
pnpm install
```

Set `PLASMO_PUBLIC_BACKEND_URL` in the appropriate environment file:

```env
PLASMO_PUBLIC_BACKEND_URL=https://your-backend.com
```

Development uses `.env.development`; production builds use `.env.production`.

## Development

Start the Plasmo watcher:

```bash
pnpm dev
```

For Chrome, load this generated directory in `chrome://extensions/`:

```text
build/chrome-mv3-dev/
```

It contains the generated `manifest.json`. Keep the watcher running while developing and reload the extension after changes. The `.plasmo/` directory is an internal Plasmo workspace and should not be loaded as an unpacked extension.

The development package includes Plasmo's live-reload support, which may cause Chrome to show a broad site-access warning. This is development tooling, not access to other installed apps or device services. For the least-privilege browser prompt, use the production package from `build/chrome-mv3-prod/`.

## Production Builds

```bash
pnpm build:chrome
```

Chrome MV3 output:

```text
build/chrome-mv3-prod/
```

```bash
pnpm build:firefox
```

Firefox MV2 output:

```text
build/firefox-mv2-prod/
```

Build both targets with:

```bash
pnpm build:all
```

The `build:all` script produces both directories above. It does not create ZIP archives.

## Loading the Extension

### Chrome

1. Open `chrome://extensions/`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select `build/chrome-mv3-dev/` for development or `build/chrome-mv3-prod/` for production.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click Load Temporary Add-on.
3. Select `build/firefox-mv2-prod/manifest.json`.

## Project Structure

```text
extension/
├── assets/               # Plasmo assets, including the extension icon
├── build/                # Generated Plasmo builds
├── src/
│   ├── auth/             # Better Auth client
│   ├── background.ts     # Plasmo background entrypoint
│   ├── background/       # Background message handling
│   ├── contents/         # Plasmo content-script entrypoints
│   ├── content/          # Content-script implementation
│   ├── core/             # Shared tracking logic
│   ├── popup.tsx         # Plasmo popup and login state
│   ├── shared/           # Shared utilities and messaging
│   └── sites/            # Site detection and parsers
├── package.json          # Scripts, manifest settings, and dependencies
└── tsconfig.json         # TypeScript configuration
```

Plasmo generates the browser manifest from `package.json` and the entrypoint configuration. The legacy files in `public/` are not the files loaded by the current Plasmo build.

## Available Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Watch and build the Chrome development package |
| `pnpm build` | Build the Chrome production package |
| `pnpm build:chrome` | Build Chrome MV3 |
| `pnpm build:firefox` | Build Firefox MV2 |
| `pnpm build:all` | Build both browser targets |

## Supported Sites

- Asura Scans
- Comix
- Mangadex
- Mangafire
- Manganato
- End Level through the generic parser

## Troubleshooting

If the extension does not load, confirm that the selected directory contains `manifest.json`. For development, ensure `pnpm dev` is still running and use the reload button in the browser's extension page after rebuilding.

The extension only declares `storage`, the configured Manga Tracker backend, and content-script access for the supported manga sites. It does not request access to other installed applications or device services.

If API requests fail, verify `PLASMO_PUBLIC_BACKEND_URL`, backend CORS/trusted-origin settings, and that the account is signed in. The popup displays a sign-in action when no Better Auth session is available.

## Publishing

Create an archive of the relevant production directory before uploading it to the Chrome Web Store or Firefox Add-ons Store:

```bash
cd build/chrome-mv3-prod && zip -r ../../tomari-chrome-extension.zip .
cd ../firefox-mv2-prod && zip -r ../../tomari-firefox-extension.zip .
```
