import { z } from 'zod';
import type { Rule } from '../types';

/**
 * Zod schema for validating a single rule
 */
const ruleSchema = z.object({
  id: z.string().min(1),
  original: z.string(),
  placeholder: z.string(),
  type: z.enum(['exact', 'regex']),
  enabled: z.boolean().default(false),
  caseSensitive: z.boolean().default(false),
  priority: z.number().default(0),
  createdAt: z.string().min(1).default(() => new Date().toISOString()),
  updatedAt: z.string().min(1).default(() => new Date().toISOString()),
}).refine(
  (rule) => {
    // Validate regex patterns are valid
    if (rule.type === 'regex') {
      try {
        new RegExp(rule.original);
        return true;
      } catch {
        return false;
      }
    }
    return true;
  },
  { message: 'Invalid regex pattern' }
);

/**
 * Validate a single rule object
 * Returns the validated rule or null if invalid
 */
export function validateRule(rule: unknown): Rule | null {
  const result = ruleSchema.safeParse(rule);
  if (result.success) {
    return result.data;
  }
  return null;
}

/**
 * Validate and sanitize an array of rules from storage
 * Filters out invalid rules and logs warnings
 */
export function validateRules(data: unknown): Rule[] {
  if (!Array.isArray(data)) {
    if (data !== null && data !== undefined) {
      console.warn('[Redactly] Storage data is not an array, resetting to empty');
    }
    return [];
  }

  const validRules: Rule[] = [];
  let invalidCount = 0;

  for (const item of data) {
    const result = ruleSchema.safeParse(item);
    if (result.success) {
      validRules.push(result.data);
    } else {
      invalidCount++;
    }
  }

  if (invalidCount > 0) {
    console.warn(`[Redactly] Filtered out ${invalidCount} invalid rule(s) from storage`);
  }

  return validRules;
}
