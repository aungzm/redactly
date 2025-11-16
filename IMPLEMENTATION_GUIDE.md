# Editable Messages - Implementation Guide

## Quick Overview

**Goal:** Detect when users edit previously sent messages in ChatGPT/Claude and apply real-time redaction, just like the main input field.

**Strategy:** Use MutationObserver to detect edit mode activation, then attach the same redaction logic you already use for the main input.

## Core Concept

```
User clicks "Edit" on message
         ↓
MutationObserver detects contenteditable field appears
         ↓
Attach input/paste event listeners (reuse existing logic)
         ↓
Apply real-time redaction as user types
         ↓
User clicks "Save" → redacted text is submitted
         ↓
Clean up event listeners
```

## Implementation Steps

### Step 1: Create Shared Edit Field Handler

This will reuse your existing redaction logic from [`setupProseMirrorInterception()`](src/content-scripts/chatgpt.ts:103) and [`setupClaudeInterception()`](src/content-scripts/claude.ts:100).

**File:** `src/content-scripts/shared/editable-field-handler.ts`

```typescript
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
      log(`🔄 Edit field redaction: "${currentText}" → "${result.text}"`);
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
      log(`📋 Edit field paste redaction: "${pastedText}" → "${result.text}"`);
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

        this.skipNextInput = true;
        this.skipNextRedaction = true;

        this.element.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  };

  private getEditorText(): string {
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
    // Save cursor position
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
```

### Step 2: Create Edit Mode Monitor

This watches for edit fields appearing in message bubbles.

**File:** `src/content-scripts/shared/edit-mode-monitor.ts`

```typescript
import type { Rule } from '../../types';
import { EditableFieldHandler } from './editable-field-handler';
import { log } from './utils';

export interface EditModeConfig {
  messageSelector: string;
  editFieldSelector: string;
  saveButtonSelector?: string;
  cancelButtonSelector?: string;
}

export class EditModeMonitor {
  private observer: MutationObserver;
  private activeHandlers: Map<HTMLElement, EditableFieldHandler> = new Map();
  private config: EditModeConfig;
  private rules: Rule[];
  private isEnabled: boolean;

  constructor(config: EditModeConfig, rules: Rule[], isEnabled: boolean) {
    this.config = config;
    this.rules = rules;
    this.isEnabled = isEnabled;
    this.setupObserver();
    this.scanExistingEditFields(); // Catch any already-open edit fields
  }

  private setupObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          this.checkForEditFields(mutation.addedNodes);
        }

        // Watch for contenteditable attribute changes
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'contenteditable'
        ) {
          const target = mutation.target as HTMLElement;
          if (this.isEditField(target)) {
            this.handleEditFieldActivated(target);
          }
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['contenteditable'],
    });
  }

  private scanExistingEditFields(): void {
    const editFields = document.querySelectorAll(this.config.editFieldSelector);
    editFields.forEach((field) => {
      if (this.isEditField(field as HTMLElement)) {
        this.handleEditFieldActivated(field as HTMLElement);
      }
    });
  }

  private checkForEditFields(nodes: NodeList): void {
    nodes.forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const element = node as HTMLElement;

      if (this.isEditField(element)) {
        this.handleEditFieldActivated(element);
      }

      const editFields = element.querySelectorAll(this.config.editFieldSelector);
      editFields.forEach((field) => {
        if (this.isEditField(field as HTMLElement)) {
          this.handleEditFieldActivated(field as HTMLElement);
        }
      });
    });
  }

  private isEditField(element: HTMLElement): boolean {
    if (!element.matches(this.config.editFieldSelector)) return false;
    if (!element.hasAttribute('contenteditable')) return false;

    // Must be inside a message bubble, not the main input
    const messageContainer = element.closest(this.config.messageSelector);
    return messageContainer !== null;
  }

  private handleEditFieldActivated(element: HTMLElement): void {
    if (this.activeHandlers.has(element)) return;

    log(`📝 Edit field detected in message bubble`);

    const handler = new EditableFieldHandler(
      {
        element,
        onComplete: () => this.handleEditComplete(element),
      },
      this.rules,
      this.isEnabled
    );

    this.activeHandlers.set(element, handler);
    this.watchForEditCompletion(element);
  }

  private watchForEditCompletion(editField: HTMLElement): void {
    const messageContainer = editField.closest(this.config.messageSelector);
    if (!messageContainer) return;

    const cleanup = () => this.handleEditComplete(editField);

    // Watch for save/cancel buttons
    if (this.config.saveButtonSelector) {
      const saveButton = messageContainer.querySelector(
        this.config.saveButtonSelector
      );
      if (saveButton) {
        saveButton.addEventListener('click', cleanup, { once: true });
      }
    }

    if (this.config.cancelButtonSelector) {
      const cancelButton = messageContainer.querySelector(
        this.config.cancelButtonSelector
      );
      if (cancelButton) {
        cancelButton.addEventListener('click', cleanup, { once: true });
      }
    }

    // Also watch for the edit field being removed from DOM
    const removalObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.removedNodes.forEach((node) => {
          if (node === editField || (node as Element).contains?.(editField)) {
            cleanup();
            removalObserver.disconnect();
          }
        });
      }
    });

    removalObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private handleEditComplete(element: HTMLElement): void {
    const handler = this.activeHandlers.get(element);
    if (handler) {
      handler.destroy();
      this.activeHandlers.delete(element);
      log('✅ Edit field handler cleaned up');
    }
  }

  public updateRules(newRules: Rule[]): void {
    this.rules = newRules;
    this.activeHandlers.forEach((handler) => handler.updateRules(newRules));
  }

  public destroy(): void {
    this.observer.disconnect();
    this.activeHandlers.forEach((handler) => handler.destroy());
    this.activeHandlers.clear();
  }
}
```

### Step 3: Integrate into ChatGPT Content Script

**File:** `src/content-scripts/chatgpt.ts`

Add at the top with other imports:
```typescript
import { EditModeMonitor, type EditModeConfig } from './shared/edit-mode-monitor';
```

Add configuration constant after `SELECTORS`:
```typescript
const EDIT_MODE_CONFIG: EditModeConfig = {
  messageSelector: '[data-message-author-role="user"]', // User message container
  editFieldSelector: '#prompt-textarea',
  saveButtonSelector: 'button[data-testid="save-button"]',
  cancelButtonSelector: 'button[data-testid="cancel-button"]',
};
```

Add variable to track the monitor:
```typescript
let editModeMonitor: EditModeMonitor | null = null;
```

Update the [`init()`](src/content-scripts/chatgpt.ts:32) function to initialize the monitor:
```typescript
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

    // NEW: Set up edit mode monitoring
    editModeMonitor = new EditModeMonitor(EDIT_MODE_CONFIG, rules, isEnabled);
    log('✅ Edit mode monitoring initialized');

    onRulesChanged((newRules) => {
      log('Rules updated', newRules);
      rules = newRules;
      editModeMonitor?.updateRules(newRules);
    });

    log('Initialization complete');
  } catch (error) {
    logError('Failed to initialize', error);
  }
}
```

### Step 4: Integrate into Claude Content Script

**File:** `src/content-scripts/claude.ts`

Same imports and setup as ChatGPT:

```typescript
import { EditModeMonitor, type EditModeConfig } from './shared/edit-mode-monitor';

const EDIT_MODE_CONFIG: EditModeConfig = {
  messageSelector: '[data-is-streaming="false"]', // Message container
  editFieldSelector: '[data-testid="chat-input"]',
  // Claude might use different button selectors - adjust as needed
  saveButtonSelector: 'button[aria-label="Save"]',
  cancelButtonSelector: 'button[aria-label="Cancel"]',
};

let editModeMonitor: EditModeMonitor | null = null;
```

Update [`init()`](src/content-scripts/claude.ts:32) function similarly:
```typescript
async function init(): Promise<void> {
  try {
    log('Initializing Claude content script');

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

    // NEW: Set up edit mode monitoring
    editModeMonitor = new EditModeMonitor(EDIT_MODE_CONFIG, rules, isEnabled);
    log('✅ Edit mode monitoring initialized');

    onRulesChanged((newRules) => {
      log('Rules updated', newRules);
      rules = newRules;
      editModeMonitor?.updateRules(newRules);
    });

    log('Initialization complete');
  } catch (error) {
    logError('Failed to initialize', error);
  }
}
```

## Key Points

### 1. Selector Discovery
You'll need to inspect ChatGPT and Claude to find the exact selectors. Use browser DevTools:

**ChatGPT:**
- Click "Edit" on a user message
- Inspect the edit field that appears
- Note the selectors for: message container, edit field, save/cancel buttons

**Claude:**
- Same process
- Claude's UI might be different, so selectors will vary

### 2. Reusing Existing Logic
The [`EditableFieldHandler`](IMPLEMENTATION_GUIDE.md:27) class reuses the same redaction logic from your existing [`setupProseMirrorInterception()`](src/content-scripts/chatgpt.ts:103) function. This ensures consistency.

### 3. Memory Management
The monitor automatically cleans up handlers when:
- Save/Cancel buttons are clicked
- Edit field is removed from DOM
- Extension is disabled

### 4. Performance
- MutationObserver only watches for specific changes
- Handlers are created on-demand
- Cleanup happens automatically

## Debugging Tips

1. **Check console logs:** All actions are logged with emojis (📝, 🔄, ✅)
2. **Verify selectors:** If edit fields aren't detected, check your selectors
3. **Test cleanup:** Edit a message, cancel, edit again - should work smoothly
4. **Multiple edits:** Open multiple messages for editing simultaneously

## What This Solves

✅ Detects edit mode activation automatically  
✅ Applies real-time redaction while editing  
✅ Handles paste events in edit fields  
✅ Preserves cursor position  
✅ Cleans up properly when editing completes  
✅ Works for multiple simultaneous edits  
✅ Reuses existing redaction logic  

## Next Steps

1. **Discover selectors:** Use DevTools to find exact selectors for ChatGPT and Claude
2. **Implement files:** Create the two new files ([`editable-field-handler.ts`](IMPLEMENTATION_GUIDE.md:27), [`edit-mode-monitor.ts`](IMPLEMENTATION_GUIDE.md:189))
3. **Update content scripts:** Add the integration code to [`chatgpt.ts`](src/content-scripts/chatgpt.ts:1) and [`claude.ts`](src/content-scripts/claude.ts:1)
4. **Test manually:** Edit messages and verify redaction works
5. **Refine selectors:** Adjust if needed based on actual DOM structure
