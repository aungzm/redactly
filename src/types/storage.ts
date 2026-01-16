import type { Rule } from './rules';

export type SupportedSite = 'chatgpt.com' | 'claude.ai' | 'chat.deepseek.com' | 'gemini.google.com';

export interface SiteSettings {
  enabled: boolean;
  lastUsed: string | null;      // ISO 8601 timestamp or null
}

export interface SiteSettingsMap {
  [site: string]: SiteSettings;
}

export interface UISettings {
  highlightRedacted: boolean;
}

export interface ExtensionSettings {
  version: string;               // Semantic version
  ui: UISettings;
}

export interface StorageData {
  rules: Rule[];
  siteSettings: SiteSettingsMap;
  settings: ExtensionSettings;
}
