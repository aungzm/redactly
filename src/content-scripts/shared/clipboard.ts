import type { Rule } from '../../types';
import { unredact } from './redactor';

// Store listener reference and current rules for dynamic updates
let currentRules: Rule[] = [];
let currentContainerSelector: string | undefined;
let clipboardListener: ((e: ClipboardEvent) => void) | null = null;

/**
 * Create the clipboard event listener
 */
function createClipboardListener(rules: Rule[], containerSelector?: string): (e: ClipboardEvent) => void {
  return (e: ClipboardEvent) => {
    // If containerSelector is provided, only handle copy events within that container
    if (containerSelector) {
      const target = e.target as HTMLElement;
      const container = target.closest(containerSelector);
      if (!container) {
        return; // Not within the specified container
      }
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const selectedText = selection.toString();
    if (!selectedText) {
      return;
    }

    // Un-redact the selected text
    const unredactedText = unredact(selectedText, rules);

    // Only intercept if text was actually un-redacted
    if (unredactedText !== selectedText && e.clipboardData) {
      e.preventDefault();
      e.clipboardData.setData('text/plain', unredactedText);

      // Also handle HTML content if available
      try {
        const range = selection.getRangeAt(0);
        const container = document.createElement('div');
        container.appendChild(range.cloneContents());
        const htmlContent = container.innerHTML;

        if (htmlContent) {
          const unredactedHTML = unredactHTML(htmlContent, rules);
          e.clipboardData.setData('text/html', unredactedHTML);
        }
      } catch (error) {
        console.error('Error handling HTML clipboard content:', error);
        // Fallback to plain text only
      }
    }
  };
}

/**
 * Set up clipboard interception for un-redaction
 * @param rules - Array of redaction rules
 * @param containerSelector - Optional selector to limit clipboard interception to specific container
 */
export function setupClipboard(rules: Rule[], containerSelector?: string): void {
  currentRules = rules;
  currentContainerSelector = containerSelector;
  clipboardListener = createClipboardListener(rules, containerSelector);
  document.addEventListener('copy', clipboardListener);
}

/**
 * Un-redact HTML content while preserving structure
 * @param html - HTML content with placeholders
 * @param rules - Array of redaction rules
 * @returns Un-redacted HTML
 */
function unredactHTML(html: string, rules: Rule[]): string {
  // Create a temporary element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Process text nodes recursively
  function processNode(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      // Un-redact text content
      if (node.textContent) {
        node.textContent = unredact(node.textContent, rules);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Recursively process child nodes
      Array.from(node.childNodes).forEach(processNode);
    }
  }

  processNode(temp);
  return temp.innerHTML;
}

/**
 * Update clipboard rules (call this when rules change)
 * @param newRules - Updated array of rules
 */
export function updateClipboardRules(newRules: Rule[]): void {
  // Remove old listener if it exists
  if (clipboardListener) {
    document.removeEventListener('copy', clipboardListener);
  }

  // Update rules and create new listener
  currentRules = newRules;
  clipboardListener = createClipboardListener(currentRules, currentContainerSelector);
  document.addEventListener('copy', clipboardListener);
}
