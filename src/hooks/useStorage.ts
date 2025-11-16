import { useState, useEffect } from 'react';
import type { Rule } from '../types';

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
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes.rules) {
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
