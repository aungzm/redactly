import { useState, useEffect, useCallback } from 'react';
import type { SiteSettingsMap, SupportedSite } from '../types';

export const useSiteSettings = () => {
  const [siteSettings, setSiteSettings] = useState<SiteSettingsMap>({});
  const [currentSite, setCurrentSite] = useState<SupportedSite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load site settings from storage
    chrome.storage.local.get(['siteSettings'], (result) => {
      if (result.siteSettings) {
        setSiteSettings(result.siteSettings);
      }
      setLoading(false);
    });

    // Get current tab to determine site
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        const url = new URL(tabs[0].url);
        const hostname = url.hostname;

        // Check if it's a supported site
        if (
          hostname === 'chatgpt.com' ||
          hostname === 'claude.ai' ||
          hostname === 'chat.deepseek.com'
        ) {
          setCurrentSite(hostname as SupportedSite);
        }
      }
    });

    // Listen for storage changes
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes.siteSettings) {
        setSiteSettings(changes.siteSettings.newValue || {});
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const toggleSite = useCallback(
    async (site: SupportedSite) => {
      const updatedSettings = {
        ...siteSettings,
        [site]: {
          ...siteSettings[site],
          enabled: !siteSettings[site]?.enabled,
        },
      };
      await chrome.storage.local.set({ siteSettings: updatedSettings });
    },
    [siteSettings]
  );

  const isSiteEnabled = useCallback(
    (site: SupportedSite): boolean => {
      return siteSettings[site]?.enabled ?? false;
    },
    [siteSettings]
  );

  return {
    siteSettings,
    currentSite,
    loading,
    toggleSite,
    isSiteEnabled,
    isEnabled: currentSite ? isSiteEnabled(currentSite) : false,
  };
};
