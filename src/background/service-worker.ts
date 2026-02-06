import type { Rule, SiteSettings, SiteSettingsMap, SupportedSite } from '../types';
import { validateRules } from '../lib/validateRules';

async function initializeStorage(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['rules', 'siteSettings', 'settings']);

    if (!result.rules) {
      await chrome.storage.local.set({ rules: [] as Rule[] });
    }

    if (!result.siteSettings) {
      const defaultSiteSettings: SiteSettingsMap = {
        'chatgpt.com': { enabled: true, lastUsed: null },
        'claude.ai': { enabled: true, lastUsed: null },
        'chat.deepseek.com': { enabled: true, lastUsed: null },
        'gemini.google.com': { enabled: true, lastUsed: null },
      };
      await chrome.storage.local.set({ siteSettings: defaultSiteSettings });
    }

    if (!result.settings) {
      const defaultSettings = {
        version: '0.1.0',
        ui: { highlightRedacted: false },
      };
      await chrome.storage.local.set({ settings: defaultSettings });
    }

    console.log('[Redactly] Storage initialized successfully');
  } catch (error) {
    console.error('[Redactly] Failed to initialize storage:', error);
  }
}
export async function getRules(): Promise<Rule[]> {
  const result = await chrome.storage.local.get(['rules']);
  return validateRules(result.rules);
}

export async function saveRule(rule: Rule): Promise<void> {
  const rules = await getRules();
  rules.push(rule);
  await chrome.storage.local.set({ rules });
}

export async function updateRule(id: string, updates: Partial<Rule>): Promise<void> {
  const rules = await getRules();
  const index = rules.findIndex((r) => r.id === id);
  if (index !== -1) {
    rules[index] = { ...rules[index], ...updates, updatedAt: new Date().toISOString() };
    await chrome.storage.local.set({ rules });
  }
}

export async function deleteRule(id: string): Promise<void> {
  const rules = await getRules();
  const filtered = rules.filter((r) => r.id !== id);
  await chrome.storage.local.set({ rules: filtered });
}

export async function getSiteSettings(): Promise<SiteSettingsMap> {
  const result = await chrome.storage.local.get(['siteSettings']);
  return result.siteSettings || {};
}

export async function updateSiteSettings(site: SupportedSite, settings: SiteSettings): Promise<void> {
  const siteSettings = await getSiteSettings();
  siteSettings[site] = settings;
  await chrome.storage.local.set({ siteSettings });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') {
    console.error('[Redactly] Invalid message format:', message);
    return false;
  }

  if (message.type === 'GET_RULES') {
    getRules()
      .then(sendResponse)
      .catch((error) => {
        console.error('[Redactly] Error getting rules:', error);
        sendResponse([]);
      });
    return true; // Indicates async response
  }

  if (message.type === 'GET_SITE_SETTINGS') {
    getSiteSettings()
      .then(sendResponse)
      .catch((error) => {
        console.error('[Redactly] Error getting site settings:', error);
        sendResponse({});
      });
    return true;
  }

  if (message.type === 'UPDATE_SITE_LAST_USED') {
    // Validate payload
    const site = message.payload?.site;
    if (!site || typeof site !== 'string') {
      console.error('[Redactly] Invalid payload for UPDATE_SITE_LAST_USED:', message.payload);
      return false;
    }

    getSiteSettings()
      .then((settings) => {
        if (settings[site]) {
          settings[site].lastUsed = new Date().toISOString();
          return chrome.storage.local.set({ siteSettings: settings });
        }
      })
      .catch((error) => {
        console.error('[Redactly] Error updating site last used:', error);
      });
    return false;
  }

  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Redactly] Extension installed');
  initializeStorage().catch((error) => {
    console.error('[Redactly] Failed to initialize on install:', error);
  });
});

// Initialize storage on service worker startup
initializeStorage().catch((error) => {
  console.error('[Redactly] Failed to initialize on startup:', error);
});
