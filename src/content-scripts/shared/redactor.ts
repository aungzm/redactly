import type { Rule, RedactionResult } from '../../types';

interface CompiledRule extends Rule {
  regex?: RegExp;                // Compiled regex pattern
  sortPriority: number;          // For sorting (exact=2, regex=1, then by rule.priority)
}

/**
 * Compile a rule into an optimized format with priority
 */
export function compileRule(rule: Rule): CompiledRule {
  let regex: RegExp | undefined;
  let sortPriority: number = 1; // Default priority

  switch (rule.type) {
    case 'exact': {
      // For exact matches, create a regex with word boundaries
      const escapedOriginal = escapeRegExp(rule.original);
      regex = new RegExp(escapedOriginal, rule.caseSensitive ? 'g' : 'gi');
      sortPriority = 2;
      break;
    }

    case 'regex':
      // Use provided regex pattern directly
      try {
        // Apply case sensitivity: if caseSensitive is true, use 'g' flag only
        // if false, use 'gi' flags for case-insensitive matching
        regex = new RegExp(rule.original, rule.caseSensitive ? 'g' : 'gi');
      } catch (e) {
        console.error(`Invalid regex pattern in rule ${rule.id}:`, e);
        // Fallback to exact match if regex is invalid
        const escaped = escapeRegExp(rule.original);
        regex = new RegExp(escaped, rule.caseSensitive ? 'g' : 'gi');
      }
      sortPriority = 1;
      break;
  }

  return {
    ...rule,
    regex,
    sortPriority,
  };
}

/**
 * Escape special regex characters for exact matching
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Redact text using the provided rules
 * @param text - The text to redact
 * @param rules - Array of redaction rules
 * @returns RedactionResult with redacted text and applied rule IDs
 */
export function redact(text: string, rules: Rule[]): RedactionResult {
  if (!text || rules.length === 0) {
    return { text, appliedRules: [] };
  }

  // Filter enabled rules and compile them
  const enabledRules = rules.filter((rule) => rule.enabled);
  const compiledRules = enabledRules.map(compileRule);

  // Sort by type priority first (exact=2, regex=1), then by rule priority (lower number = higher priority)
  compiledRules.sort((a, b) => {
    if (a.sortPriority !== b.sortPriority) {
      return b.sortPriority - a.sortPriority; // Exact (2) before regex (1)
    }
    return a.priority - b.priority; // Within same type, lower priority number = higher priority
  });

  let redactedText = text;
  const appliedRules: string[] = [];

  // Apply each rule
  for (const rule of compiledRules) {
    if (rule.regex) {
      const before = redactedText;
      redactedText = redactedText.replace(rule.regex, rule.placeholder);

      // Track if rule was applied
      if (before !== redactedText) {
        appliedRules.push(rule.id);
      }
    }
  }

  return {
    text: redactedText,
    appliedRules,
  };
}

/**
 * Un-redact text by reversing the placeholders back to originals
 * @param text - The redacted text
 * @param rules - Array of redaction rules
 * @returns Original text with placeholders replaced
 */
export function unredact(text: string, rules: Rule[]): string {
  if (!text || rules.length === 0) {
    return text;
  }

  // Filter enabled rules
  const enabledRules = rules.filter((rule) => rule.enabled);

  let unredactedText = text;

  // Apply reverse replacements (placeholder -> original)
  // Process in reverse priority order to handle overlapping rules correctly
  const compiledRules = enabledRules.map(compileRule);
  compiledRules.sort((a, b) => {
    if (a.sortPriority !== b.sortPriority) {
      return a.sortPriority - b.sortPriority; // Regex (1) before exact (2) for unredaction
    }
    return b.priority - a.priority; // Within same type, higher priority number = higher priority for unredaction
  });

  for (const rule of compiledRules) {
    // Create a regex to find the placeholder
    const escapedPlaceholder = escapeRegExp(rule.placeholder);
    const placeholderRegex = new RegExp(escapedPlaceholder, 'g');

    unredactedText = unredactedText.replace(placeholderRegex, rule.original);
  }

  return unredactedText;
}

/**
 * Validate a regex pattern
 * @param pattern - The regex pattern to validate
 * @returns true if valid, false otherwise
 */
export function validateRegex(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}
