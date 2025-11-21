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

const SITE_NAME = 'chatgpt.com';

const SELECTORS = {
  input: '#prompt-textarea',
  submitButton: 'button[data-testid="send-button"]',
  responseContainer: 'main',
};

const EDIT_MODE_CONFIG: EditModeConfig = {
  messageSelector: '.group\\/turn-messages',
  editFieldSelector: 'textarea.resize-none',
  saveButtonSelector: 'button.btn-primary',
  cancelButtonSelector: 'button.btn-secondary',
};

let rules: Rule[] = [];
let isEnabled = false;
let editModeMonitor: EditModeMonitor | null = null;

/**
 * Initialize the content script
 */
async function init(): Promise<void> {
  try {
    log('Initializing ChatGPT content script');

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
 * Set up input redaction for ChatGPT
 */
async function setupInputRedaction(): Promise<void> {
  log('Setting up input redaction');

  const inputElement = await waitForElement(SELECTORS.input);

  if (!inputElement) {
    logError('Could not find input element');
    return;
  }

  log(`Input element found: ${inputElement.tagName}`);

  if (inputElement.hasAttribute('contenteditable')) {
    log('Detected ProseMirror contenteditable div');
    setupProseMirrorInterception(inputElement as HTMLDivElement);
  } else if (inputElement.tagName === 'TEXTAREA') {
    log('Detected textarea element');
    setupTextareaInterception(inputElement as HTMLTextAreaElement);
  } else {
    logError(`Unknown input element type: ${inputElement.tagName}`);
    return;
  }

  observeForNewInputs();
}

/**
 * Set up interception for ProseMirror contenteditable div
 */
function setupProseMirrorInterception(element: HTMLDivElement): void {
  log('Setting up ProseMirror interception');

  let isRedacting = false;
  let skipNextInput = false;
  let skipNextRedaction = false;

  function getEditorText(): string {
    const paragraphs = element.querySelectorAll('p');

    if (paragraphs.length > 0) {
      const texts = Array.from(paragraphs).map((p) => {
        return (p.innerText || p.textContent || '').trim();
      });
      const result = texts.join('\n').trim();
      return result;
    }

    return (element.textContent || '').trim();
  }

  let lastCapturedText = '';

  element.addEventListener(
    'beforeinput',
    (e: Event) => {
      const beforeInputEvent = e as InputEvent;
      log(`beforeinput event fired - inputType: ${beforeInputEvent.inputType}`);
      if (beforeInputEvent.inputType === 'insertLineBreak') {
        lastCapturedText = getEditorText();
        log(`beforeinput (Enter) - Captured text: "${lastCapturedText}"`);
      }
    },
    true
  );

  element.addEventListener(
    'input',
    () => {
      if (skipNextInput) {
        skipNextInput = false;
        return;
      }

      if (skipNextRedaction) {
        skipNextRedaction = false;
        return;
      }

      const currentText = getEditorText();
      lastCapturedText = currentText;

      if (!isEnabled || rules.length === 0) {
        return;
      }

      const result = redact(currentText, rules);

      if (result.appliedRules.length > 0) {
        log(`Real-time redaction: "${currentText}" → "${result.text}"`);

        const selection = window.getSelection();
        let cursorOffset = 0;

        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const preCaretRange = range.cloneRange();
          preCaretRange.selectNodeContents(element);
          preCaretRange.setEnd(range.endContainer, range.endOffset);
          cursorOffset = preCaretRange.toString().length;
        }

        const lengthDiff = result.text.length - currentText.length;

        element.innerHTML = '<p></p>';
        const paragraph = element.querySelector('p');
        if (paragraph) {
          paragraph.textContent = result.text;
        }

        const newSelection = window.getSelection();
        if (newSelection && paragraph) {
          const range = document.createRange();
          const textNode = paragraph.firstChild;

          if (textNode) {
            let newOffset = cursorOffset + lengthDiff;

            const maxOffset = textNode.textContent?.length || 0;
            newOffset = Math.max(0, Math.min(newOffset, maxOffset));

            range.setStart(textNode, newOffset);
            range.collapse(true);
            newSelection.removeAllRanges();
            newSelection.addRange(range);
          }
        }

        lastCapturedText = result.text;

        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    true
  );

  element.addEventListener(
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

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);

          range.deleteContents();

          const textNode = document.createTextNode(result.text);
          range.insertNode(textNode);

          range.setStartAfter(textNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);

          skipNextInput = true;
          skipNextRedaction = true;

          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    },
    true
  );

  document.addEventListener(
    'click',
    (e: MouseEvent) => {
      if (isRedacting) return;

      const target = e.target as HTMLElement;
      const submitButton = target.closest('button[data-testid="send-button"]');

      if (submitButton) {
        const textContent = getEditorText();

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

          element.innerHTML = '<p></p>';
          element.focus();

          const paragraph = element.querySelector('p');
          if (paragraph) {
            paragraph.textContent = result.text;
          }

          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));

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

  log('ProseMirror interception setup complete');
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
      const submitButton = target.closest('button[data-testid="send-button"]');

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

          if (input.hasAttribute('contenteditable')) {
            setupProseMirrorInterception(input as HTMLDivElement);
          } else if (input.tagName === 'TEXTAREA') {
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
