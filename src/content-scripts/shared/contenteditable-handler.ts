import type { Rule } from '../../types';
import { redact } from './redactor';
import { log, ListenerManager } from './utils';

interface ContenteditableHandlerParams {
  element: HTMLDivElement;
  submitButtonSelector: string;
  getRules: () => Rule[];
  getIsEnabled: () => boolean;
  listenerManager: ListenerManager;
}

export function setupContenteditableInterception({
  element,
  submitButtonSelector,
  getRules,
  getIsEnabled,
  listenerManager,
}: ContenteditableHandlerParams): void {
  log('Setting up contenteditable interception');

  listenerManager.cleanup();

  let isRedacting = false;
  let skipNextInput = false;
  let skipNextRedaction = false;

  function getEditorText(): string {
    const paragraphs = element.querySelectorAll('p');

    if (paragraphs.length > 0) {
      const texts = Array.from(paragraphs).map((p) => {
        return (p.innerText || p.textContent || '').trim();
      });
      return texts.join('\n').trim();
    }

    return (element.textContent || '').trim();
  }

  let lastCapturedText = '';

  listenerManager.addEventListener(element, 'beforeinput', (e: Event) => {
    const beforeInputEvent = e as InputEvent;
    log(`beforeinput event fired - inputType: ${beforeInputEvent.inputType}`);
    if (beforeInputEvent.inputType === 'insertLineBreak') {
      lastCapturedText = getEditorText();
      log(`beforeinput (Enter) - Captured text: "${lastCapturedText}"`);
    }
  }, true);

  listenerManager.addEventListener(element, 'input', () => {
    if (skipNextInput) {
      skipNextInput = false;
      return;
    }

    if (skipNextRedaction) {
      skipNextRedaction = false;
      return;
    }

    const rules = getRules();
    const currentText = getEditorText();
    lastCapturedText = currentText;

    if (!getIsEnabled() || rules.length === 0) {
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
  }, true);

  listenerManager.addEventListener(element, 'paste', (e: Event) => {
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
  }, true);

  listenerManager.addEventListener(document, 'click', (e: Event) => {
    const mouseEvent = e as MouseEvent;
    if (isRedacting) return;

    const target = mouseEvent.target as HTMLElement;
    const submitButton = target.closest(submitButtonSelector);

    if (submitButton) {
      const textContent = getEditorText();

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
  }, true);

  log('Contenteditable interception setup complete');
}
