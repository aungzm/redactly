// scripts/build-manifests.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const basePath = path.resolve(__dirname, '../public/manifest.base.json');
const outChrome = path.resolve(__dirname, '../public/manifest.chrome.json');
const outFirefox = path.resolve(__dirname, '../public/manifest.firefox.json');

// Read base manifest
const baseManifest = JSON.parse(fs.readFileSync(basePath, 'utf8'));

// Chrome Manifest V3
const chromeManifest = {
  ...baseManifest,
  manifest_version: 3,
  action: {
    default_popup: "src/popup/index.html",
    default_icon: {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  options_page: "src/options/index.html",
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module"
  }
};

// Firefox Manifest V3
const firefoxManifest = {
  ...baseManifest,
  manifest_version: 3,
  action: {
    default_popup: "src/popup/index.html",
    default_icon: {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  options_page: "src/options/index.html",
  background: {
    scripts: ["src/background/service-worker.ts"],
    type: "module"
  },
  browser_specific_settings: {
    gecko: {
      id: "redactly@local",
      strict_min_version: "109.0"
    }
  }
};

// Write manifests
fs.writeFileSync(outChrome, JSON.stringify(chromeManifest, null, 2), 'utf8');
fs.writeFileSync(outFirefox, JSON.stringify(firefoxManifest, null, 2), 'utf8');

console.log('✓ Generated manifest.chrome.json (Manifest V3)');
console.log('✓ Generated manifest.firefox.json (Manifest V3)');
