import type { Rule, SiteSettings, SiteSettingsMap, SupportedSite } from '../types';

async function initializeStorage(): Promise<void> {
  const result = await chrome.storage.local.get(['rules', 'siteSettings', 'settings']);

  if (!result.rules) {
    await chrome.storage.local.set({ rules: [] as Rule[] });
  }

  if (!result.siteSettings) {
    const defaultSiteSettings: SiteSettingsMap = {
      'chatgpt.com': { enabled: true, lastUsed: null },
      'claude.ai': { enabled: true, lastUsed: null },
      'chat.deepseek.com': { enabled: true, lastUsed: null },
    };
    await chrome.storage.local.set({ siteSettings: defaultSiteSettings });
  }

  if (!result.settings) {
    const defaultSettings = {
      version: '0.1.0',
      encryption: { enabled: false, algorithm: 'AES-GCM' as const },
      ui: { highlightRedacted: false },
    };
    await chrome.storage.local.set({ settings: defaultSettings });
  }
}
export async function getRules(): Promise<Rule[]> {
  const result = await chrome.storage.local.get(['rules']);
  return result.rules || [];
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
  if (message.type === 'GET_RULES') {
    getRules().then(sendResponse);
    return true; // Indicates async response
  }

  if (message.type === 'GET_SITE_SETTINGS') {
    getSiteSettings().then(sendResponse);
    return true;
  }

  if (message.type === 'UPDATE_SITE_LAST_USED') {
    const { site } = message.payload;
    getSiteSettings().then((settings) => {
      if (settings[site]) {
        settings[site].lastUsed = new Date().toISOString();
        chrome.storage.local.set({ siteSettings: settings });
      }
    });
    return false;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Redactly extension installed');
  initializeStorage();
});

initializeStorage();
