# Redactly

A privacy-focused browser extension that automatically redacts sensitive information before submitting to AI services and restores it when copying responses.

## Features

Redactly provides comprehensive privacy protection for your interactions with AI services through intelligent redaction and restoration of sensitive data.

### Core Redaction Capabilities

- **Automatic Redaction**: Automatically redacts sensitive information before it's sent to AI services, protecting your privacy while you work
- **Smart Restoration**: Restores original sensitive data when you copy responses from AI services, so you get complete, usable information
- **Flexible Rule System**: Create custom redaction rules using exact text matching or powerful regular expressions to target any type of sensitive data
- **Priority-Based Processing**: Rules are applied in priority order, allowing you to control which patterns take precedence when multiple rules could match

### Supported AI Services

Redactly works seamlessly with the following AI platforms:
- ChatGPT
- Claude
- Google Gemini
- DeepSeek

### Rule Management

- **Multiple Rule Types**: Choose between exact text matching for simple replacements or regex patterns for complex data patterns
- **Case Sensitivity Control**: Optionally make rules case-sensitive for more precise matching
- **Enable/Disable Rules**: Toggle individual rules on or off without deleting them, giving you flexibility to test different configurations
- **Rule Prioritization**: Reorder rules to control the sequence in which they're applied to your text
- **Import/Export**: Backup your rules or share configurations by exporting to JSON and importing from files
- **Bulk Rule Management**: Select multiple rules to enable, disable, change type, or delete in a single action

### Backup and Restore

- **Complete Backups**: Export all your rules, site settings, and application preferences to a single JSON file
- **Selective Restore**: Choose exactly what to restore from a backup - rules, site settings, or app preferences
- **Backup Preview**: View backup details (creation date, version, counts) before restoring
- **Data Safety**: Clear warnings before overwriting existing data to prevent accidental loss

### Site-Level Control

- **Per-Site Settings**: Enable or disable redaction on a per-site basis, giving you granular control over which AI services use your rules
- **Quick Toggle**: Use the extension popup to quickly enable or disable redaction for the current site
- **Rules Counter**: See at a glance how many rules are active and how many total rules you have configured

### Testing and Validation

- **Rule Tester**: Built-in testing interface to validate your redaction rules before using them in production
- **Real-Time Preview**: Test your rules against sample text to ensure they work as expected

### User Experience

- **Dark Mode Support**: Full dark mode support for comfortable use in any lighting condition
- **Intuitive Interface**: Clean, organized options page with dedicated tabs for rules management, site settings, and testing
- **Responsive Design**: Works smoothly across different screen sizes and browser windows

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
