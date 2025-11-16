import type { Rule } from './rules';

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
