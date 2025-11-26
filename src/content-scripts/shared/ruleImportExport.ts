import type { Rule } from '../../types';

export interface ExportData {
  version: string;
  exportedAt: string;
  rules: Rule[];
}

export interface ImportResult {
  success: boolean;
  message: string;
  duplicates?: string[];
  importedCount?: number;
  hasConflicts?: boolean;
  conflictingRules?: string[];
}

export type ConflictResolution = 'cancel' | 'override' | 'skip';

export interface ConflictResolutionMap {
  [ruleOriginal: string]: ConflictResolution;
}

/**
 * Export rules to JSON format
 */
export const exportRules = (rules: Rule[]): string => {
  const exportData: ExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    rules: rules,
  };
  return JSON.stringify(exportData, null, 2);
};

/**
 * Import rules from JSON with conflict detection
 * Returns conflicts instead of failing, allowing user to choose resolution
 */
export const importRules = (
  jsonContent: string,
  existingRules: Rule[]
): ImportResult => {
  try {
    const importData: ExportData = JSON.parse(jsonContent);

    // Validate structure
    if (!importData.rules || !Array.isArray(importData.rules)) {
      return {
        success: false,
        message: 'Invalid import file format. Missing or invalid "rules" array.',
      };
    }

    // Create a map of existing rule originals for quick lookup
    const existingOriginals = new Map(
      existingRules.map((rule) => [rule.original, rule])
    );

    // Check for conflicts
    const conflictingRules: string[] = [];
    const rulesToImport: Rule[] = [];

    for (const importedRule of importData.rules) {
      // Validate rule structure
      if (!importedRule.original || !importedRule.placeholder) {
        return {
          success: false,
          message: 'Invalid rule in import file. Each rule must have "original" and "placeholder" fields.',
        };
      }

      // Check if this rule already exists
      if (existingOriginals.has(importedRule.original)) {
        conflictingRules.push(importedRule.original);
      } else {
        rulesToImport.push(importedRule);
      }
    }

    // If there are conflicts, return with conflict info (not a failure)
    if (conflictingRules.length > 0) {
      return {
        success: false,
        hasConflicts: true,
        message: `Found ${conflictingRules.length} conflicting rule(s). Choose how to handle them.`,
        conflictingRules,
        importedCount: rulesToImport.length,
      };
    }

    // Return success with count
    return {
      success: true,
      message: `Successfully imported ${rulesToImport.length} rule(s).`,
      importedCount: rulesToImport.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to parse JSON: ${errorMessage}`,
    };
  }
};

/**
 * Get the rules to import from JSON with conflict resolution
 * Handles override and skip strategies for conflicting rules
 */
export const getRulesToImportWithConflictResolution = (
  jsonContent: string,
  existingRules: Rule[],
  resolutionMap: ConflictResolutionMap
): { rulesToImport: Rule[]; rulesToOverride: Rule[] } => {
  const importData: ExportData = JSON.parse(jsonContent);
  const rulesToImport: Rule[] = [];
  const rulesToOverride: Rule[] = [];

  const existingOriginals = new Map(
    existingRules.map((rule) => [rule.original, rule])
  );

  for (const importedRule of importData.rules || []) {
    const resolution = resolutionMap[importedRule.original] || 'skip';

    if (resolution === 'override') {
      rulesToOverride.push(importedRule);
    } else if (resolution !== 'skip') {
      // Only add non-conflicting rules or those not being skipped
      if (!existingOriginals.has(importedRule.original)) {
        rulesToImport.push(importedRule);
      }
    }
  }

  return { rulesToImport, rulesToOverride };
};

/**
 * Get the rules to import from JSON (after validation passes)
 */
export const getRulesToImport = (jsonContent: string): Rule[] => {
  const importData: ExportData = JSON.parse(jsonContent);
  return importData.rules || [];
};
