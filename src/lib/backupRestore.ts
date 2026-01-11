import type { Rule, SiteSettingsMap, ExtensionSettings } from '../types';

export interface BackupData {
  version: string;
  backupVersion: string;
  exportedAt: string;
  data: {
    rules: Rule[];
    siteSettings: SiteSettingsMap;
    settings: ExtensionSettings;
  };
}

export interface RestoreResult {
  success: boolean;
  message: string;
  details?: {
    rulesCount: number;
    sitesCount: number;
    settingsRestored: boolean;
  };
}

export interface RestoreOptions {
  restoreRules: boolean;
  restoreSiteSettings: boolean;
  restoreSettings: boolean;
}

const BACKUP_VERSION = '1.0';

/**
 * Create a full backup of all Redactly data
 */
export const createBackup = async (): Promise<string> => {
  const result = await chrome.storage.local.get(['rules', 'siteSettings', 'settings']);

  const backupData: BackupData = {
    version: '0.1.0', // App version
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      rules: result.rules || [],
      siteSettings: result.siteSettings || {},
      settings: result.settings || {
        version: '0.1.0',
        encryption: { enabled: false, algorithm: 'AES-GCM' },
        ui: { highlightRedacted: false },
      },
    },
  };

  return JSON.stringify(backupData, null, 2);
};

/**
 * Validate backup file structure
 */
export const validateBackup = (jsonContent: string): { valid: boolean; error?: string; data?: BackupData } => {
  try {
    const parsed = JSON.parse(jsonContent);

    // Check if it's a backup file (has data property) vs old rules-only export
    if (!parsed.data && parsed.rules) {
      return {
        valid: false,
        error: 'This appears to be a rules-only export file. Please use "Import Rules" in the Rules tab instead.',
      };
    }

    if (!parsed.data) {
      return {
        valid: false,
        error: 'Invalid backup file format. Missing "data" property.',
      };
    }

    if (!parsed.backupVersion) {
      return {
        valid: false,
        error: 'Invalid backup file format. Missing backup version.',
      };
    }

    // Validate data structure
    const { data } = parsed;

    if (!Array.isArray(data.rules)) {
      return {
        valid: false,
        error: 'Invalid backup file. "rules" must be an array.',
      };
    }

    if (typeof data.siteSettings !== 'object' || data.siteSettings === null) {
      return {
        valid: false,
        error: 'Invalid backup file. "siteSettings" must be an object.',
      };
    }

    return { valid: true, data: parsed as BackupData };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to parse backup file: ${error instanceof Error ? error.message : 'Invalid JSON'}`,
    };
  }
};

/**
 * Restore from a backup file
 */
export const restoreBackup = async (
  jsonContent: string,
  options: RestoreOptions = { restoreRules: true, restoreSiteSettings: true, restoreSettings: true }
): Promise<RestoreResult> => {
  const validation = validateBackup(jsonContent);

  if (!validation.valid || !validation.data) {
    return {
      success: false,
      message: validation.error || 'Invalid backup file',
    };
  }

  const { data } = validation.data;
  const updates: Record<string, unknown> = {};
  const details = {
    rulesCount: 0,
    sitesCount: 0,
    settingsRestored: false,
  };

  if (options.restoreRules && data.rules) {
    // Ensure all rules have required fields and regenerate IDs/timestamps
    const restoredRules = data.rules.map((rule, index) => ({
      ...rule,
      id: rule.id || crypto.randomUUID(),
      priority: rule.priority ?? index,
      createdAt: rule.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      enabled: rule.enabled ?? true,
      caseSensitive: rule.caseSensitive ?? false,
      type: rule.type || 'exact',
    }));
    updates.rules = restoredRules;
    details.rulesCount = restoredRules.length;
  }

  if (options.restoreSiteSettings && data.siteSettings) {
    updates.siteSettings = data.siteSettings;
    details.sitesCount = Object.keys(data.siteSettings).length;
  }

  if (options.restoreSettings && data.settings) {
    updates.settings = data.settings;
    details.settingsRestored = true;
  }

  if (Object.keys(updates).length === 0) {
    return {
      success: false,
      message: 'No data selected for restore.',
    };
  }

  try {
    await chrome.storage.local.set(updates);

    const parts: string[] = [];
    if (details.rulesCount > 0) parts.push(`${details.rulesCount} rule(s)`);
    if (details.sitesCount > 0) parts.push(`${details.sitesCount} site setting(s)`);
    if (details.settingsRestored) parts.push('app settings');

    return {
      success: true,
      message: `Successfully restored: ${parts.join(', ')}.`,
      details,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Get backup file info without restoring
 */
export const getBackupInfo = (jsonContent: string): {
  valid: boolean;
  error?: string;
  info?: {
    exportedAt: string;
    appVersion: string;
    backupVersion: string;
    rulesCount: number;
    sitesCount: number;
    hasSettings: boolean;
  };
} => {
  const validation = validateBackup(jsonContent);

  if (!validation.valid || !validation.data) {
    return { valid: false, error: validation.error };
  }

  const { data } = validation.data;

  return {
    valid: true,
    info: {
      exportedAt: validation.data.exportedAt,
      appVersion: validation.data.version,
      backupVersion: validation.data.backupVersion,
      rulesCount: data.rules?.length || 0,
      sitesCount: Object.keys(data.siteSettings || {}).length,
      hasSettings: !!data.settings,
    },
  };
};
