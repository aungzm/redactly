import { useCallback } from 'react';
import { useStorage } from './useStorage';
import type { Rule } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { importRules as validateImport, getRulesToImport, getRulesToImportWithConflictResolution } from '../content-scripts/shared/ruleImportExport';
import type { ImportResult, ConflictResolutionMap } from '../content-scripts/shared/ruleImportExport';

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

  const importRulesFromJson = useCallback(
    async (jsonContent: string): Promise<ImportResult> => {
      // Validate import
      const validationResult = validateImport(jsonContent, rules);
      
      if (!validationResult.success) {
        return validationResult;
      }

      // Get rules to import
      const rulesToImport = getRulesToImport(jsonContent);

      // Add new IDs and timestamps to imported rules
      const newRules = rulesToImport.map((rule) => ({
        ...rule,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Merge with existing rules
      const updatedRules = [...rules, ...newRules];
      await chrome.storage.local.set({ rules: updatedRules });

      return validationResult;
    },
    [rules]
  );

  const importRulesWithConflictResolution = useCallback(
    async (jsonContent: string, resolutionMap: ConflictResolutionMap): Promise<ImportResult> => {
      // Get rules with conflict resolution applied
      const { rulesToImport, rulesToOverride } = getRulesToImportWithConflictResolution(
        jsonContent,
        rules,
        resolutionMap
      );

      // Add new IDs and timestamps to new imported rules
      const newRules = rulesToImport.map((rule) => ({
        ...rule,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Update existing rules that are being overridden
      const updatedExistingRules = rules.map((existingRule) => {
        const override = rulesToOverride.find((r) => r.original === existingRule.original);
        if (override) {
          return {
            ...existingRule,
            placeholder: override.placeholder,
            updatedAt: new Date().toISOString(),
          };
        }
        return existingRule;
      });

      // Merge: keep updated existing rules + add new rules
      const finalRules = [...updatedExistingRules, ...newRules];
      await chrome.storage.local.set({ rules: finalRules });

      const totalImported = rulesToImport.length + rulesToOverride.length;
      return {
        success: true,
        message: `Successfully imported ${totalImported} rule(s).${rulesToOverride.length > 0 ? ` (${rulesToOverride.length} overridden)` : ''}`,
        importedCount: totalImported,
      };
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
    importRulesFromJson,
    importRulesWithConflictResolution,
  };
};
