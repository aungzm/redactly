import { useState, useEffect, useCallback } from 'react';
import type { Rule } from '../types';
import { validateRules } from '../lib/validateRules';

/**
 * Migrate rules to ensure all have required fields (e.g., priority)
 * This handles backwards compatibility with older stored rules
 */
function migrateRules(storedRules: Rule[]): Rule[] {
  return storedRules.map((rule, index) => {
    if (rule.priority === undefined) {
      // Assign priority based on type and order
      const sameTypeRules = storedRules.filter((r) => r.type === rule.type);
      const priority = sameTypeRules.indexOf(rule);
      return { ...rule, priority: priority >= 0 ? priority : index };
    }
    return rule;
  });
}

export const useStorage = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  // Wrapper to validate and migrate before setting rules
  const setValidatedRules = useCallback((data: unknown) => {
    const validatedRules = validateRules(data);
    const migratedRules = migrateRules(validatedRules);
    setRules(migratedRules);
  }, []);

  useEffect(() => {
    // Load rules from chrome.storage.local
    chrome.storage.local.get(['rules'], (result) => {
      setValidatedRules(result.rules);
      setLoading(false);
    });

    // Listen for storage changes
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes.rules) {
        // Apply same validation and migration logic to storage changes
        setValidatedRules(changes.rules.newValue);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [setValidatedRules]);

  return { rules, loading };
};
