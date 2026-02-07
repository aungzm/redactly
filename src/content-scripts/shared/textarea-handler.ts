import type { Rule } from '../../types';
import { redact } from './redactor';
import { log, ListenerManager } from './utils';

interface TextareaHandlerParams {
  textarea: HTMLTextAreaElement;
  submitButtonSelector: string;
  getRules: () => Rule[];
  getIsEnabled: () => boolean;
  listenerManager: ListenerManager;
}

export function setupTextareaInterception({
  textarea,
  submitButtonSelector,
  getRules,
  getIsEnabled,
  listenerManager,
}: TextareaHandlerParams): void {
  log('Setting up textarea interception');

  listenerManager.cleanup();

  let isRedacting = false;
  let skipNextInput = false;

  listenerManager.addEventListener(textarea, 'input', () => {
    if (skipNextInput) {
      skipNextInput = false;
      return;
    }

    const rules = getRules();
    const currentText = textarea.value;

    if (!getIsEnabled() || rules.length === 0) {
      return;
    }

    const result = redact(currentText, rules);

    if (result.appliedRules.length > 0) {
      log(`Real-time redaction: "${currentText}" → "${result.text}"`);

      const cursorPosition = textarea.selectionStart;
      const lengthDiff = result.text.length - currentText.length;

      textarea.value = result.text;

      const newPosition = Math.max(0, Math.min(cursorPosition + lengthDiff, result.text.length));
      textarea.setSelectionRange(newPosition, newPosition);

      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, true);

  listenerManager.addEventListener(textarea, 'paste', (e: Event) => {
    const clipboardEvent = e as ClipboardEvent;
    const rules = getRules();
    if (!getIsEnabled() || rules.length === 0) {
      return;
    }

    const pastedText = clipboardEvent.clipboardData?.getData('text/plain') || '';

    if (!pastedText) {
      return;
    }

    const result = redact(pastedText, rules);

    if (result.appliedRules.length > 0) {
      log(`Paste detected - Redacting: "${pastedText}" → "${result.text}"`);

      e.preventDefault();

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = textarea.value;

      const newValue = currentValue.substring(0, start) + result.text + currentValue.substring(end);
      textarea.value = newValue;

      const newPosition = start + result.text.length;
      textarea.setSelectionRange(newPosition, newPosition);

      skipNextInput = true;

      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, true);

  listenerManager.addEventListener(document, 'click', (e: Event) => {
    const mouseEvent = e as MouseEvent;
    if (isRedacting) return;

    const target = mouseEvent.target as HTMLElement;
    const submitButton = target.closest(submitButtonSelector);

    if (submitButton) {
      const textContent = textarea.value;

      if (!textContent || !getIsEnabled()) {
        return;
      }

      const rules = getRules();
      const result = redact(textContent, rules);
      log(
        `Button clicked - Text: "${textContent}", Redacted: "${result.text}", Rules applied: ${result.appliedRules.length}`
      );

      if (result.appliedRules.length > 0) {
        log(`Button clicked - Preventing and redacting: "${textContent}" → "${result.text}"`);

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        isRedacting = true;

        textarea.value = result.text;
        textarea.focus();

        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));

        setTimeout(() => {
          log('Resubmitting with button click');
          isRedacting = false;
          (submitButton as HTMLButtonElement).click();
        }, 100);
      }
    }
  }, true);

  log('Textarea interception setup complete');
}
