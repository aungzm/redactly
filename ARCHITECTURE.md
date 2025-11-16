# Redactly Architecture

This document describes the technical architecture and design decisions for the Redactly browser extension.

## Table of Contents

1. [Overview](#overview)
2. [Extension Structure](#extension-structure)
3. [Data Models](#data-models)
4. [Core Components](#core-components)
5. [Data Flow](#data-flow)
6. [Security Considerations](#security-considerations)
7. [Browser Compatibility](#browser-compatibility)

## Overview

Redactly is a browser extension built using TypeScript and Manifest V3 for Chrome/Edge/Brave compatibility. The extension operates entirely client-side with no external server communication.

### Key Design Principles

- **Type Safety**: Built with TypeScript for compile-time error checking and better IDE support
- **Privacy First**: All data stored locally, no telemetry
- **Site-Specific**: Tailored content scripts for each AI service
- **Non-Intrusive**: Minimal performance impact
- **Fail-Safe**: Graceful degradation if issues occur

### Build System

- **TypeScript**: v5.0+ for type checking and compilation
- **Bundler**: Vite for fast bundling and HMR during development
- **UI Framework**: React 18+ for building interactive UIs
- **Styling**: TailwindCSS for utility-first styling
- **Output**: Compiled JavaScript in `dist/` directory
- **Source Maps**: Generated for debugging

## Extension Structure

### Source Structure (`src/`)

```
redactly/
├── src/                          # TypeScript/React source files
│   ├── background/
│   │   └── service-worker.ts    # Background service worker
│   ├── content-scripts/
│   │   ├── chatgpt.ts           # ChatGPT-specific logic
│   │   ├── claude.ts            # Claude-specific logic
│   │   ├── deepseek.ts          # DeepSeek-specific logic
│   │   └── shared/
│   │       ├── redactor.ts      # Core redaction engine
│   │       ├── clipboard.ts     # Clipboard interception
│   │       └── utils.ts         # Shared utilities
│   ├── popup/
│   │   ├── index.html           # Popup entry HTML
│   │   ├── Popup.tsx            # Main popup React component
│   │   ├── main.tsx             # Popup entry point
│   │   └── components/          # Popup-specific components
│   │       ├── SiteToggle.tsx   # Site enable/disable toggle
│   │       ├── RulesCounter.tsx # Active rules display
│   │       └── QuickActions.tsx # Quick action buttons
│   ├── options/
│   │   ├── index.html           # Options entry HTML
│   │   ├── Options.tsx          # Main options React component
│   │   ├── main.tsx             # Options entry point
│   │   └── components/          # Options-specific components
│   │       ├── RuleForm.tsx     # Rule creation/edit form
│   │       ├── RuleList.tsx     # Rules list display
│   │       ├── RuleItem.tsx     # Individual rule item
│   │       ├── SiteSettings.tsx # Site settings management
│   │       └── RuleTester.tsx   # Test redaction interface
│   ├── components/              # Shared React components
│   │   ├── Button.tsx           # Reusable button component
│   │   ├── Input.tsx            # Reusable input component
│   │   ├── Select.tsx           # Reusable select component
│   │   ├── Toggle.tsx           # Reusable toggle component
│   │   └── Modal.tsx            # Reusable modal component
│   ├── hooks/                   # Custom React hooks
│   │   ├── useStorage.ts        # Chrome storage hook
│   │   ├── useRules.ts          # Rules management hook
│   │   └── useSiteSettings.ts   # Site settings hook
│   ├── types/
│   │   ├── index.ts             # Shared type definitions
│   │   ├── storage.ts           # Storage-related types
│   │   └── rules.ts             # Rule-related types
│   ├── lib/
│   │   └── crypto.ts            # Encryption utilities (future)
│   └── assets/
│       └── icons/               # Extension icons
├── public/                       # Static assets
│   └── manifest.json            # Extension manifest (V3)
├── dist/                         # Compiled output (gitignored)
├── package.json
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite build configuration
├── tailwind.config.js            # TailwindCSS configuration
└── postcss.config.js             # PostCSS configuration
```

## Data Models

All data models are defined using TypeScript interfaces for type safety.

### Rule Types (`src/types/rules.ts`)

```typescript
export type RuleType = 'exact' | 'pattern' | 'regex';

export interface Rule {
  id: string;                    // UUID v4
  original: string;              // Original text to redact
  placeholder: string;           // Replacement text
  type: RuleType;                // Matching type
  enabled: boolean;              // Active status
  caseSensitive: boolean;        // Case sensitivity (for exact/pattern)
  createdAt: string;            // ISO 8601 timestamp
  updatedAt: string;            // ISO 8601 timestamp
}

export interface RedactionResult {
  text: string;                  // Redacted text
  appliedRules: string[];        // IDs of applied rules
}
```

### Storage Types (`src/types/storage.ts`)

```typescript
export type SupportedSite = 'chatgpt.com' | 'claude.ai' | 'chat.deepseek.com';

export interface SiteSettings {
  enabled: boolean;
  lastUsed: string | null;      // ISO 8601 timestamp or null
}

export interface SiteSettingsMap {
  [site: string]: SiteSettings;
}

export interface EncryptionSettings {
  enabled: boolean;
  algorithm: 'AES-GCM';          // Future: support multiple algorithms
}

export interface UISettings {
  highlightRedacted: boolean;
}

export interface ExtensionSettings {
  version: string;               // Semantic version
  encryption: EncryptionSettings;
  ui: UISettings;
}

export interface StorageData {
  rules: Rule[];
  siteSettings: SiteSettingsMap;
  settings: ExtensionSettings;
}
```

### Chrome Extension Types

```typescript
// Extend chrome namespace with proper types
declare namespace chrome.storage {
  interface StorageArea {
    get(keys: string | string[] | null): Promise<StorageData>;
    set(items: Partial<StorageData>): Promise<void>;
  }
}
```

## Core Components

### 1. Background Service Worker (`service-worker.ts`)

**Responsibilities:**
- Manage extension state
- Handle storage operations
- Coordinate between content scripts
- Monitor site navigation

**Key Functions:**
```typescript
import type { Rule, StorageData, SiteSettings } from '../types';

// Storage operations
async function getRules(): Promise<Rule[]>
async function saveRule(rule: Rule): Promise<void>
async function updateRule(id: string, updates: Partial<Rule>): Promise<void>
async function deleteRule(id: string): Promise<void>
async function getSiteSettings(): Promise<SiteSettingsMap>
async function updateSiteSettings(site: SupportedSite, settings: SiteSettings): Promise<void>

// Rule processing
function compileRules(rules: Rule[]): CompiledRule[]
```

### 2. Redaction Engine (`redactor.ts`)

**Responsibilities:**
- Apply redaction rules to text
- Reverse redaction (un-redact)
- Handle different rule types

**Type Definitions:**
```typescript
interface CompiledRule extends Rule {
  regex?: RegExp;                // Compiled regex pattern
  priority: number;              // For sorting (exact=3, pattern=2, regex=1)
}
```

**Key Functions:**
```typescript
function redact(text: string, rules: Rule[]): RedactionResult
function unredact(text: string, rules: Rule[]): string
function compileRule(rule: Rule): CompiledRule
```

**Algorithm:**
1. Sort rules by priority (exact > pattern > regex)
2. Apply each rule sequentially
3. Track replacements for bidirectional mapping
4. Return redacted text + metadata

### 3. Content Scripts (Site-Specific)

Each AI service requires custom selectors and logic due to different DOM structures.

#### ChatGPT (`chatgpt.ts`)

**Target Elements:**
- Input: `textarea[data-id="root"]` (or current selector)
- Submit: Form submission or Enter key
- Response: `.markdown` containers

**Interception Points:**
1. Monitor textarea input events
2. Intercept form submission
3. Apply redaction before send
4. Monitor copy events on response area

**Type Definitions:**
```typescript
interface SiteConfig {
  inputSelector: string;
  submitSelector: string;
  responseSelector: string;
}
```

#### Claude (`claude.ts`)

**Target Elements:**
- Input: `.ProseMirror` contenteditable div
- Submit: Send button click
- Response: Message containers

**Interception Points:**
1. Monitor contenteditable changes
2. Intercept send button click
3. Apply redaction to content
4. Monitor copy events on messages

#### DeepSeek (`deepseek.ts`)

**Target Elements:**
- Input: (TBD - similar pattern to above)
- Submit: (TBD)
- Response: (TBD)

### 4. Clipboard Manager (`clipboard.ts`)

**Responsibilities:**
- Intercept copy events
- Un-redact copied text
- Handle edge cases (partial selection, formatted text)

**Implementation:**
```typescript
import type { Rule } from '../../types';
import { unredact } from './redactor';

export function setupClipboard(rules: Rule[], containerSelector: string): void {
  document.addEventListener('copy', (e: ClipboardEvent) => {
    const selection = window.getSelection()?.toString();
    if (!selection || !e.clipboardData) return;

    const unredacted = unredact(selection, rules);

    e.preventDefault();
    e.clipboardData.setData('text/plain', unredacted);
    e.clipboardData.setData('text/html', unredactHTML(selection, rules));
  });
}

function unredactHTML(html: string, rules: Rule[]): string {
  // Un-redact while preserving HTML structure
  return unredact(html, rules);
}
```

### 5. Popup UI (`Popup.tsx`)

**Features:**
- Quick enable/disable for current site
- View active rules count
- Quick access to options page

**React Component Structure:**
```typescript
// src/popup/Popup.tsx
import React from 'react';
import { SiteToggle } from './components/SiteToggle';
import { RulesCounter } from './components/RulesCounter';
import { QuickActions } from './components/QuickActions';
import { useStorage } from '../hooks/useStorage';
import { useSiteSettings } from '../hooks/useSiteSettings';

interface PopupState {
  currentSite: SupportedSite | null;
  isEnabled: boolean;
  rulesCount: number;
}

export const Popup: React.FC = () => {
  const { rules } = useStorage();
  const { currentSite, isEnabled, toggleSite } = useSiteSettings();

  return (
    <div className="w-80 p-4 bg-white dark:bg-gray-800">
      <h1 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Redactly
      </h1>
      <SiteToggle
        site={currentSite}
        enabled={isEnabled}
        onToggle={toggleSite}
      />
      <RulesCounter count={rules.length} />
      <QuickActions />
    </div>
  );
};
```

**Styling with TailwindCSS:**
- Utility-first approach for rapid UI development
- Dark mode support out of the box
- Responsive design with Tailwind utilities

### 6. Options Page (`Options.tsx`)

**Features:**
- CRUD operations for rules
- Rule type selection (exact/pattern/regex)
- Test redaction with sample text
- Site settings management
- Import/export rules (future)

**React Component Structure:**
```typescript
// src/options/Options.tsx
import React, { useState } from 'react';
import { RuleList } from './components/RuleList';
import { RuleForm } from './components/RuleForm';
import { RuleTester } from './components/RuleTester';
import { SiteSettings } from './components/SiteSettings';
import { useRules } from '../hooks/useRules';

export const Options: React.FC = () => {
  const { rules, addRule, updateRule, deleteRule } = useRules();
  const [activeTab, setActiveTab] = useState<'rules' | 'sites' | 'test'>('rules');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          Redactly Options
        </h1>

        <nav className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            className={`pb-2 px-4 ${activeTab === 'rules' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('rules')}
          >
            Rules
          </button>
          <button
            className={`pb-2 px-4 ${activeTab === 'sites' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('sites')}
          >
            Sites
          </button>
          <button
            className={`pb-2 px-4 ${activeTab === 'test' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('test')}
          >
            Test
          </button>
        </nav>

        {activeTab === 'rules' && (
          <>
            <RuleForm onSubmit={addRule} />
            <RuleList
              rules={rules}
              onUpdate={updateRule}
              onDelete={deleteRule}
            />
          </>
        )}
        {activeTab === 'sites' && <SiteSettings />}
        {activeTab === 'test' && <RuleTester rules={rules} />}
      </div>
    </div>
  );
};
```

**Type Definitions:**
```typescript
interface FormData {
  original: string;
  placeholder: string;
  type: RuleType;
  caseSensitive: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

**Styling with TailwindCSS:**
- Consistent design system across all components
- Responsive layout for different screen sizes
- Dark mode support with `dark:` variants
- Custom components styled with Tailwind utilities

## Data Flow

### Outgoing Message Flow (Redaction)

```
User types message
       ↓
Content script detects input
       ↓
Retrieve rules from storage
       ↓
Apply redaction via redactor.js
       ↓
Replace input text with redacted version
       ↓
User submits → Redacted text sent to AI
```

### Incoming Message Flow (Clipboard)

```
User copies AI response text
       ↓
Clipboard event intercepted
       ↓
Get selected text
       ↓
Apply un-redaction via redactor.js
       ↓
Override clipboard with original text
       ↓
User pastes → Original text restored
```

### Storage Flow

```
All components
      ↓
chrome.storage.local API
      ↓
Browser's local storage
(No external servers)
```

## Security Considerations

### Current (v1.0)

1. **Local Storage**: All data in `chrome.storage.local`
   - Not encrypted by default
   - Readable if someone has filesystem access
   - Acceptable for MVP

2. **No Network Calls**: Extension doesn't make external requests
   - Reduces attack surface
   - No data leakage risk

3. **Content Security Policy**: Strict CSP in manifest
   - No inline scripts
   - No eval()
   - Limited resource loading

4. **Permissions**: Minimal required permissions
   - `storage`: For local data
   - `activeTab`: For current tab access
   - Host permissions: Only for supported AI sites

### Future Enhancements

1. **Optional Encryption**
   - Web Crypto API (AES-GCM)
   - User-provided password/passphrase
   - Encrypt rules before storage
   - Decrypt on-demand

2. **Rule Validation**
   - Sanitize user input
   - Validate regex patterns
   - Prevent ReDoS attacks

## Browser Compatibility

### Primary Target: Chrome/Edge/Brave (Manifest V3)

**Minimum Version:**
- Chrome 88+
- Edge 88+
- Brave 1.20+

**Key APIs Used:**
- `chrome.storage.local`
- `chrome.runtime`
- `chrome.tabs`
- Content scripts
- Service workers

### Future: Firefox Support

Firefox has different manifest requirements and APIs. Consider:
- Manifest V2 vs V3 support
- `browser.*` vs `chrome.*` namespaces
- Service worker differences

## Performance Considerations

1. **Rule Compilation**: Pre-compile regex patterns at load time
2. **Lazy Loading**: Load rules only when needed
3. **Debouncing**: Debounce input events to reduce processing
4. **Efficient Selectors**: Use specific, performant DOM selectors
5. **Memory Management**: Clean up event listeners on navigation

## Testing Strategy

1. **Unit Tests**: Core redaction logic (using Jest + ts-jest)
2. **Integration Tests**: Content script interaction with pages
3. **Type Checking**: `tsc --noEmit` for type validation
4. **Manual Testing**: Each AI site with various scenarios
5. **Edge Cases**:
   - Empty rules
   - Overlapping patterns
   - Unicode characters
   - Code blocks
   - Formatted text

### Test Examples

```typescript
import { redact, unredact } from '../src/content-scripts/shared/redactor';
import type { Rule } from '../src/types';

describe('Redactor', () => {
  const testRule: Rule = {
    id: '123',
    original: 'Samuel',
    placeholder: '{name}',
    type: 'exact',
    enabled: true,
    caseSensitive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  test('should redact exact matches', () => {
    const result = redact('Hello Samuel!', [testRule]);
    expect(result.text).toBe('Hello {name}!');
    expect(result.appliedRules).toContain('123');
  });
});
```

## TypeScript Configuration

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,

    /* Chrome Extension Types */
    "types": ["chrome", "node"],

    /* Path Aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@types/*": ["./src/types/*"],
      "@components/*": ["./src/components/*"],
      "@hooks/*": ["./src/hooks/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### tsconfig.node.json

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

### Key TypeScript Features Used

1. **Strict Type Checking**: All strict flags enabled
2. **JSX Support**: `react-jsx` transform for React components
3. **Path Aliases**: `@/`, `@components/`, `@hooks/` for cleaner imports
4. **Chrome Types**: `@types/chrome` for extension APIs
5. **React Types**: `@types/react` and `@types/react-dom` for React type definitions
6. **Utility Types**: `Partial<T>`, `Pick<T>`, `Omit<T>` for type transformations
7. **Type Guards**: Runtime type checking with TypeScript
8. **Generic Components**: Type-safe React components with generics

### Build Process with Vite

1. **Development**: `vite dev` - Fast HMR for UI development
2. **Build**: `vite build` - Production optimized build
3. **Output**: Transpiled and bundled JavaScript in `dist/`
4. **Source Maps**: Generated for debugging TypeScript and React in browser
5. **Code Splitting**: Automatic chunk splitting for optimal loading
6. **Asset Optimization**: Minification, tree-shaking, and asset optimization

## Vite Configuration

Vite is configured to build a Chrome extension with multiple entry points (popup, options, content scripts, and background worker).

### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { crx } from '@crxjs/vite-plugin';
import manifest from './public/manifest.json';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@types': resolve(__dirname, './src/types'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
      },
    },
  },
});
```

### Key Vite Features for Extension Development

1. **@crxjs/vite-plugin**: Specialized plugin for building Chrome extensions
   - Automatically handles manifest.json
   - Manages multiple entry points
   - HMR support for content scripts
   - Proper asset handling

2. **Fast Refresh**: React Fast Refresh for instant updates during development

3. **Path Aliases**: Resolved at build time for cleaner imports

4. **Optimized Builds**:
   - Tree-shaking to remove unused code
   - Minification for smaller bundle sizes
   - Code splitting for better performance

### TailwindCSS Configuration

#### tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './src/**/*.html',
  ],
  darkMode: 'class', // or 'media' for system preference
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
};
```

#### postcss.config.js

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### Entry Point Structure

Each UI page needs an HTML file and a TypeScript entry point:

#### src/popup/index.html
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Redactly Popup</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

#### src/popup/main.tsx
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Popup } from './Popup';
import '../assets/styles/globals.css'; // Tailwind imports

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
```

#### src/assets/styles/globals.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom global styles */
@layer base {
  body {
    @apply font-sans antialiased;
  }
}

@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors;
  }

  .btn-secondary {
    @apply px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors;
  }
}
```

### Custom React Hooks

The architecture uses custom hooks to encapsulate Chrome extension API logic:

#### src/hooks/useStorage.ts
```typescript
import { useState, useEffect } from 'react';
import type { StorageData, Rule } from '@types';

export const useStorage = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load rules from chrome.storage.local
    chrome.storage.local.get(['rules'], (result) => {
      if (result.rules) {
        setRules(result.rules);
      }
      setLoading(false);
    });

    // Listen for storage changes
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange }
    ) => {
      if (changes.rules) {
        setRules(changes.rules.newValue || []);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return { rules, loading };
};
```

#### src/hooks/useRules.ts
```typescript
import { useState, useCallback } from 'react';
import { useStorage } from './useStorage';
import type { Rule } from '@types';
import { v4 as uuidv4 } from 'uuid';

export const useRules = () => {
  const { rules, loading } = useStorage();

  const addRule = useCallback(async (ruleData: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRule: Rule = {
      ...ruleData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedRules = [...rules, newRule];
    await chrome.storage.local.set({ rules: updatedRules });
  }, [rules]);

  const updateRule = useCallback(async (id: string, updates: Partial<Rule>) => {
    const updatedRules = rules.map((rule) =>
      rule.id === id
        ? { ...rule, ...updates, updatedAt: new Date().toISOString() }
        : rule
    );
    await chrome.storage.local.set({ rules: updatedRules });
  }, [rules]);

  const deleteRule = useCallback(async (id: string) => {
    const updatedRules = rules.filter((rule) => rule.id !== id);
    await chrome.storage.local.set({ rules: updatedRules });
  }, [rules]);

  return {
    rules,
    loading,
    addRule,
    updateRule,
    deleteRule,
  };
};
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.19",
    "@types/chrome": "^0.0.250",
    "@types/node": "^20.8.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/uuid": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^6.7.0",
    "@typescript-eslint/parser": "^6.7.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.50.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.3",
    "typescript": "^5.2.2",
    "vite": "^4.4.9"
  }
}
```

## Future Architecture Enhancements

1. **Rule Priority System**: Allow users to set rule order
2. **Contextual Rules**: Apply rules based on conversation context
3. **Rule Groups**: Organize rules into categories
4. **Sync Support**: Optional sync via encrypted cloud storage
5. **Advanced Patterns**: Support for conditional redaction
