import { useState, useEffect, useCallback } from 'react';
import type { Rule } from '../types';

/**
 * Migrate rules to ensure all have required fields (e.g., priority)
 * This handles backwards compatibility with older stored rules
 */
function migrateRules(storedRules: Rule[]): Rule[] {
  return storedRules.map((rule) => {
    if (rule.priority === undefined) {
      // Assign priority based on type and order
      const sameTypeRules = storedRules.filter((r) => r.type === rule.type);
      const priority = sameTypeRules.indexOf(rule);
      return { ...rule, priority };
    }
    return rule;
  });
}

export const useStorage = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  // Wrapper to apply migration before setting rules
  const setMigratedRules = useCallback((newRules: Rule[]) => {
    setRules(migrateRules(newRules));
  }, []);

  useEffect(() => {
    // Load rules from chrome.storage.local
    chrome.storage.local.get(['rules'], (result) => {
      if (result.rules) {
        setMigratedRules(result.rules as Rule[]);
      }
      setLoading(false);
    });

    // Listen for storage changes
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes.rules) {
        // Apply same migration logic to storage changes
        setMigratedRules(changes.rules.newValue || []);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [setMigratedRules]);

  return { rules, loading };
};
