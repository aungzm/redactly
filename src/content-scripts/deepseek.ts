import type { Rule } from '../types';
import { redact } from './shared/redactor';
import { setupClipboard, updateClipboardRules } from './shared/clipboard';
import {
  waitForElement,
  getRulesFromStorage,
  onRulesChanged,
  log,
  logError,
  isSiteEnabled,
  updateSiteLastUsed,
} from './shared/utils';
import { EditModeMonitor, type EditModeConfig } from './shared/edit-mode-monitor';

const SITE_NAME = 'chat.deepseek.com';

const SELECTORS = {
  input: 'textarea[placeholder="Message DeepSeek"]',
  submitButton: 'button[type="submit"]',
  responseContainer: 'main',
};

const EDIT_MODE_CONFIG: EditModeConfig = {
  messageSelector: 'body',
  editFieldSelector: 'textarea[name="user query"]',
  saveButtonSelector: undefined,
  cancelButtonSelector: undefined,
};

let rules: Rule[] = [];
let isEnabled = false;
let editModeMonitor: EditModeMonitor | null = null;

/**
 * Initialize the content script
 */
async function init(): Promise<void> {
  try {
    log('Initializing DeepSeek content script');

    isEnabled = await isSiteEnabled(SITE_NAME);
    if (!isEnabled) {
      log('Site is disabled. Skipping initialization.');
      return;
    }

    rules = await getRulesFromStorage();
    log(`Loaded ${rules.length} rules`);

    updateSiteLastUsed(SITE_NAME);

    setupClipboard(rules, SELECTORS.responseContainer);

    await setupInputRedaction();

    editModeMonitor = new EditModeMonitor(EDIT_MODE_CONFIG, rules, isEnabled);
    log('Edit mode monitoring initialized');

    onRulesChanged((newRules) => {
      log('Rules updated', newRules);
      rules = newRules;
      updateClipboardRules(newRules);
      editModeMonitor?.updateRules(newRules);
    });

    log('Initialization complete');
  } catch (error) {
    logError('Failed to initialize', error);
  }
}

/**
 * Set up input redaction for DeepSeek
 */
async function setupInputRedaction(): Promise<void> {
  log('Setting up input redaction');

  const inputElement = await waitForElement(SELECTORS.input);

  if (!inputElement) {
    logError('Could not find input element');
    return;
  }

  log(`Input element found: ${inputElement.tagName}`);

  if (inputElement.tagName === 'TEXTAREA') {
    log('Detected textarea element');
    setupTextareaInterception(inputElement as HTMLTextAreaElement);
  } else {
    logError(`Unknown input element type: ${inputElement.tagName}`);
    return;
  }

  observeForNewInputs();
}

/**
 * Set up interception for textarea input
 */
function setupTextareaInterception(textarea: HTMLTextAreaElement): void {
  log('Setting up textarea interception');

  let isRedacting = false;
  let skipNextInput = false;

  textarea.addEventListener(
    'input',
    () => {
      if (skipNextInput) {
        skipNextInput = false;
        return;
      }

      const currentText = textarea.value;

      if (!isEnabled || rules.length === 0) {
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
    },
    true
  );

  textarea.addEventListener(
    'paste',
    (e: ClipboardEvent) => {
      if (!isEnabled || rules.length === 0) {
        return;
      }

      const pastedText = e.clipboardData?.getData('text/plain') || '';

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
    },
    true
  );

  document.addEventListener(
    'click',
    (e: MouseEvent) => {
      if (isRedacting) return;

      const target = e.target as HTMLElement;
      const submitButton = target.closest('button[type="submit"]');

      if (submitButton) {
        const textContent = textarea.value;

        if (!textContent || !isEnabled) {
          return;
        }

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
    },
    true
  );

  log('Textarea interception setup complete');
}

/**
 * Observe for new input elements (for SPA navigation)
 */
function observeForNewInputs(): void {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        const input = document.querySelector(SELECTORS.input) as HTMLElement;
        if (input && !input.dataset.redactlyInitialized) {
          log('New input element detected, setting up interception');
          input.dataset.redactlyInitialized = 'true';

          if (input.tagName === 'TEXTAREA') {
            setupTextareaInterception(input as HTMLTextAreaElement);
          }
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
