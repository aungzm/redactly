import { useCallback } from 'react';
import { useStorage } from './useStorage';
import type { Rule } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const useRules = () => {
  const { rules, loading } = useStorage();

  const addRule = useCallback(
    async (ruleData: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newRule: Rule = {
        ...ruleData,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedRules = [...rules, newRule];
      await chrome.storage.local.set({ rules: updatedRules });
    },
    [rules]
  );

  const updateRule = useCallback(
    async (id: string, updates: Partial<Rule>) => {
      const updatedRules = rules.map((rule) =>
        rule.id === id
          ? { ...rule, ...updates, updatedAt: new Date().toISOString() }
          : rule
      );
      await chrome.storage.local.set({ rules: updatedRules });
    },
    [rules]
  );

  const deleteRule = useCallback(
    async (id: string) => {
      const updatedRules = rules.filter((rule) => rule.id !== id);
      await chrome.storage.local.set({ rules: updatedRules });
    },
    [rules]
  );

  const toggleRule = useCallback(
    async (id: string) => {
      const updatedRules = rules.map((rule) =>
        rule.id === id
          ? { ...rule, enabled: !rule.enabled, updatedAt: new Date().toISOString() }
          : rule
      );
      await chrome.storage.local.set({ rules: updatedRules });
    },
    [rules]
  );

  return {
    rules,
    loading,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
  };
};
