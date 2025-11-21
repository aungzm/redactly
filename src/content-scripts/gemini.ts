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

const SITE_NAME = 'gemini.google.com';

const SELECTORS = {
  input: '.ql-editor.textarea.new-input-ui',
  editTextarea: 'textarea[aria-label="Edit prompt"]',
  submitButton: 'button[aria-label="Send message"], button[data-tooltip="Send message"]',
  responseContainer: 'main',
};

const EDIT_MODE_CONFIG: EditModeConfig = {
  messageSelector: '[role="article"]',
  editFieldSelector: 'textarea[aria-label="Edit prompt"]',
  saveButtonSelector: 'button[aria-label="Update message"]',
  cancelButtonSelector: 'button[aria-label="Cancel"]',
};

let rules: Rule[] = [];
let isEnabled = false;
let editModeMonitor: EditModeMonitor | null = null;

/**
 * Initialize the content script
 */
async function init(): Promise<void> {
  try {
    log('Initializing Gemini content script');

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
 * Set up input redaction for Gemini
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
    log('Detected contenteditable div');
    setupContenteditableInterception(inputElement as HTMLDivElement);
  } else {
    logError(`Unknown input element type: ${inputElement.tagName}`);
    return;
  }

  observeForNewInputs();
}

/**
 * Set up interception for contenteditable div (Quill editor)
 */
function setupContenteditableInterception(element: HTMLDivElement): void {
  log('Setting up contenteditable interception');

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
      const submitButton = target.closest(
        'button[aria-label="Send message"], button[data-tooltip="Send message"]'
      );

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

  log('Contenteditable interception setup complete');
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
            setupContenteditableInterception(input as HTMLDivElement);
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
