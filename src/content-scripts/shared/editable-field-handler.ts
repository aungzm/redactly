import type { Rule } from '../../types';
import { redact } from './redactor';
import { log } from './utils';

interface EditFieldHandlerConfig {
  element: HTMLElement;
  onComplete?: () => void;
}

export class EditableFieldHandler {
  private element: HTMLElement;
  private rules: Rule[];
  private isEnabled: boolean;
  private skipNextInput: boolean = false;
  private skipNextRedaction: boolean = false;

  constructor(config: EditFieldHandlerConfig, rules: Rule[], isEnabled: boolean) {
    this.element = config.element;
    this.rules = rules;
    this.isEnabled = isEnabled;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.element.addEventListener('input', this.handleInput, true);
    this.element.addEventListener('paste', this.handlePaste, true);
  }

  private handleInput = (): void => {
    if (this.skipNextInput) {
      this.skipNextInput = false;
      return;
    }

    if (this.skipNextRedaction) {
      this.skipNextRedaction = false;
      return;
    }

    const currentText = this.getEditorText();

    if (!this.isEnabled || this.rules.length === 0) {
      return;
    }

    const result = redact(currentText, this.rules);

    if (result.appliedRules.length > 0) {
      log(`Edit field redaction: "${currentText}" → "${result.text}"`);
      this.updateContent(result.text);
    }
  };

  private handlePaste = (e: ClipboardEvent): void => {
    if (!this.isEnabled || this.rules.length === 0) {
      return;
    }

    const pastedText = e.clipboardData?.getData('text/plain') || '';
    if (!pastedText) return;

    const result = redact(pastedText, this.rules);

    if (result.appliedRules.length > 0) {
      log(`Edit field paste redaction: "${pastedText}" → "${result.text}"`);
      e.preventDefault();

      // Handle textarea elements
      if (this.element.tagName === 'TEXTAREA') {
        const textarea = this.element as HTMLTextAreaElement;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentValue = textarea.value;

        // Insert redacted text at cursor position
        const newValue = currentValue.substring(0, start) + result.text + currentValue.substring(end);
        textarea.value = newValue;

        // Move cursor to end of inserted text
        const newPosition = start + result.text.length;
        textarea.setSelectionRange(newPosition, newPosition);

        // Set flag to skip redaction on the dispatched input event
        this.skipNextInput = true;
        this.skipNextRedaction = true;

        // Trigger input event
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }

      // Handle contenteditable elements
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

        this.skipNextInput = true;
        this.skipNextRedaction = true;

        this.element.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  };

  private getEditorText(): string {
    // Handle textarea elements
    if (this.element.tagName === 'TEXTAREA') {
      return (this.element as HTMLTextAreaElement).value;
    }
    
    // Handle contenteditable divs
    const paragraphs = this.element.querySelectorAll('p');
    if (paragraphs.length > 0) {
      return Array.from(paragraphs)
        .map((p) => (p.innerText || p.textContent || '').trim())
        .join('\n')
        .trim();
    }
    return (this.element.textContent || '').trim();
  }

  private updateContent(text: string): void {
    // Handle textarea elements
    if (this.element.tagName === 'TEXTAREA') {
      const textarea = this.element as HTMLTextAreaElement;
      const cursorPosition = textarea.selectionStart;
      const currentText = textarea.value;
      const lengthDiff = text.length - currentText.length;
      
      textarea.value = text;
      
      // Restore cursor position
      const newPosition = Math.max(0, Math.min(cursorPosition + lengthDiff, text.length));
      textarea.setSelectionRange(newPosition, newPosition);
      
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    // Handle contenteditable divs
    const selection = window.getSelection();
    let cursorOffset = 0;

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(this.element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      cursorOffset = preCaretRange.toString().length;
    }

    const currentText = this.getEditorText();
    const lengthDiff = text.length - currentText.length;

    // Update content
    this.element.innerHTML = '<p></p>';
    const paragraph = this.element.querySelector('p');
    if (paragraph) {
      paragraph.textContent = text;
    }

    // Restore cursor
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

    this.element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  public updateRules(newRules: Rule[]): void {
    this.rules = newRules;
  }

  public destroy(): void {
    this.element.removeEventListener('input', this.handleInput, true);
    this.element.removeEventListener('paste', this.handlePaste, true);
  }
}