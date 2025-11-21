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
 * Import rules from JSON with duplicate detection
 * Duplicates are detected by comparing the 'original' field (the rule key)
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

    // Check for duplicates
    const duplicates: string[] = [];
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
        duplicates.push(importedRule.original);
      } else {
        rulesToImport.push(importedRule);
      }
    }

    // If there are duplicates, return error
    if (duplicates.length > 0) {
      return {
        success: false,
        message: `Cannot import: Found ${duplicates.length} duplicate rule(s). The following rule(s) already exist:\n${duplicates.map((d) => `• "${d}"`).join('\n')}\n\nPlease delete or rename the existing rule(s) before importing.`,
        duplicates,
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
 * Get the rules to import from JSON (after validation passes)
 */
export const getRulesToImport = (jsonContent: string): Rule[] => {
  const importData: ExportData = JSON.parse(jsonContent);
  return importData.rules || [];
};
