import { useCallback } from 'react';
import { useStorage } from './useStorage';
import type { Rule } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { importRules as validateImport, getRulesToImport, getRulesToImportWithConflictResolution } from '../content-scripts/shared/ruleImportExport';
import type { ImportResult, ConflictResolutionMap } from '../content-scripts/shared/ruleImportExport';

export const useRules = () => {
  const { rules, loading } = useStorage();

  const addRule = useCallback(
    async (ruleData: Omit<Rule, 'id' | 'createdAt' | 'updatedAt' | 'priority'>) => {
      // Calculate priority based on rule type
      const sameTypeRules = rules.filter((r) => r.type === ruleData.type);
      const priority = sameTypeRules.length;

      const newRule: Rule = {
        ...ruleData,
        priority,
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

  const reorderRules = useCallback(
    async (reorderedRules: Rule[]) => {
      await chrome.storage.local.set({ rules: reorderedRules });
    },
    []
  );

  const bulkDeleteRules = useCallback(
    async (ids: string[]) => {
      const updatedRules = rules.filter((rule) => !ids.includes(rule.id));
      // Recalculate priorities for remaining rules
      const exactRules = updatedRules
        .filter((r) => r.type === 'exact')
        .sort((a, b) => a.priority - b.priority)
        .map((r, i) => ({ ...r, priority: i }));
      const regexRules = updatedRules
        .filter((r) => r.type === 'regex')
        .sort((a, b) => a.priority - b.priority)
        .map((r, i) => ({ ...r, priority: i }));
      await chrome.storage.local.set({ rules: [...exactRules, ...regexRules] });
    },
    [rules]
  );

  const bulkToggleRules = useCallback(
    async (ids: string[], enabled: boolean) => {
      const updatedRules = rules.map((rule) =>
        ids.includes(rule.id)
          ? { ...rule, enabled, updatedAt: new Date().toISOString() }
          : rule
      );
      await chrome.storage.local.set({ rules: updatedRules });
    },
    [rules]
  );

  const bulkUpdateType = useCallback(
    async (ids: string[], newType: 'exact' | 'regex') => {
      const now = new Date().toISOString();

      // Separate rules into those being changed and those not
      const unchangedRules = rules.filter((r) => !ids.includes(r.id));
      const changingRules = rules.filter((r) => ids.includes(r.id));

      // Get max priority of target type among unchanged rules
      const targetTypeUnchanged = unchangedRules.filter((r) => r.type === newType);
      const maxPriority = targetTypeUnchanged.length > 0
        ? Math.max(...targetTypeUnchanged.map((r) => r.priority))
        : -1;

      // Update changing rules with new type and priorities
      const updatedChangingRules = changingRules
        .sort((a, b) => a.priority - b.priority)
        .map((rule, index) => ({
          ...rule,
          type: newType,
          priority: maxPriority + 1 + index,
          updatedAt: now,
        }));

      // Recalculate all priorities
      const allRules = [...unchangedRules, ...updatedChangingRules];
      const exactRules = allRules
        .filter((r) => r.type === 'exact')
        .sort((a, b) => a.priority - b.priority)
        .map((r, i) => ({ ...r, priority: i }));
      const regexRules = allRules
        .filter((r) => r.type === 'regex')
        .sort((a, b) => a.priority - b.priority)
        .map((r, i) => ({ ...r, priority: i }));

      await chrome.storage.local.set({ rules: [...exactRules, ...regexRules] });
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

      // Add new IDs, timestamps, and priority to imported rules
      const newRules = rulesToImport.map((rule, index) => {
        const sameTypeRules = rules.filter((r) => r.type === rule.type);
        return {
          ...rule,
          priority: sameTypeRules.length + index,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

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

      // Add new IDs, timestamps, and priority to new imported rules
      const newRules = rulesToImport.map((rule, index) => {
        const sameTypeRules = rules.filter((r) => r.type === rule.type);
        return {
          ...rule,
          priority: sameTypeRules.length + index,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

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
    reorderRules,
    bulkDeleteRules,
    bulkToggleRules,
    bulkUpdateType,
    importRulesFromJson,
    importRulesWithConflictResolution,
  };
};
