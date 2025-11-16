# Redactly

A privacy-focused browser extension that automatically redacts sensitive information before submitting to AI services and restores it when copying responses.

## Development

### Prerequisites

- Node.js (v18 or higher)
- npm

### Setup

```bash
npm install
```

### Building

The project supports building for both Chrome (Manifest V3) and Firefox (Manifest V2).

#### Generate Manifests

Before building, generate the browser-specific manifests:

```bash
npm run prepare-manifests
```

This creates:
- `public/manifest.chrome.json` - Manifest V3 for Chrome
- `public/manifest.firefox.json` - Manifest V2 for Firefox

#### Build for Chrome

```bash
npm run build:chrome
```

Output: `dist/chrome/`

#### Build for Firefox

```bash
npm run build:firefox
```

Output: `dist/firefox/`

#### Build for Both Browsers

```bash
npm run build
```

This runs both Chrome and Firefox builds, creating:
- `dist/chrome/`
- `dist/firefox/`

### Development Mode

#### Chrome Development

```bash
npm run dev:chrome
```

#### Firefox Development

```bash
npm run dev:firefox
```

#### Default Development (Chrome)

```bash
npm run dev
```

### Other Commands

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Preview build
npm run preview
```

## Project Structure

- `public/manifest.base.json` - Base manifest template
- `public/manifest.chrome.json` - Generated Chrome manifest (MV3)
- `public/manifest.firefox.json` - Generated Firefox manifest (MV2)
- `scripts/build-manifests.js` - Manifest generation script
- `src/` - Source code
  - `background/` - Background service worker
  - `content-scripts/` - Content scripts for AI sites
  - `popup/` - Extension popup UI
  - `options/` - Options page UI
  - `components/` - Shared React components
  - `hooks/` - Custom React hooks
  - `types/` - TypeScript type definitions

## Browser Compatibility

- **Chrome/Edge**: Manifest V3
- **Firefox**: Manifest V2 (with MV3 support coming in future Firefox versions)

## License

MIT
