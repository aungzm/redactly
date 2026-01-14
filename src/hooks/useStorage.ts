import { useState, useEffect } from 'react';
import type { Rule } from '../types';

export const useStorage = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load rules from chrome.storage.local
    chrome.storage.local.get(['rules'], (result) => {
      if (result.rules) {
        // Migrate rules to add priority field if missing
        const storedRules = result.rules as Rule[];
        const migratedRules = storedRules.map((rule) => {
          if (rule.priority === undefined) {
            // Assign priority based on type and order
            const sameTypeRules = storedRules.filter((r) => r.type === rule.type);
            const priority = sameTypeRules.indexOf(rule);
            return { ...rule, priority };
          }
          return rule;
        });
        setRules(migratedRules);
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
