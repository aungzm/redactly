export type RuleType = 'exact' | 'regex';

export interface Rule {
  id: string;                    // UUID v4
  original: string;              // Original text to redact
  placeholder: string;           // Replacement text
  type: RuleType;                // Matching type
  enabled: boolean;              // Active status
  caseSensitive: boolean;        // Case sensitivity (for exact/regex)
  createdAt: string;            // ISO 8601 timestamp
  updatedAt: string;            // ISO 8601 timestamp
}

export interface RedactionResult {
  text: string;                  // Redacted text
  appliedRules: string[];        // IDs of applied rules
}
