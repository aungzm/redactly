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
  private observer!: MutationObserver;
  private activeHandlers: Map<HTMLElement, EditableFieldHandler> = new Map();
  private config: EditModeConfig;
  private rules: Rule[];
  private isEnabled: boolean;

  constructor(config: EditModeConfig, rules: Rule[], isEnabled: boolean) {
    this.config = config;
    this.rules = rules;
    this.isEnabled = isEnabled;
    this.setupObserver();
    this.scanExistingEditFields();
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
    
    // For textarea elements, we don't need contenteditable check
    const isTextarea = element.tagName === 'TEXTAREA';
    const hasContentEditable = element.hasAttribute('contenteditable');
    
    if (!isTextarea && !hasContentEditable) return false;

    // If messageSelector is 'body', accept any edit field (for modal-based edits)
    if (this.config.messageSelector === 'body') {
      return true;
    }

    // Otherwise, must be inside a message bubble, not the main input
    const messageContainer = element.closest(this.config.messageSelector);
    return messageContainer !== null;
  }

  private handleEditFieldActivated(element: HTMLElement): void {
    if (this.activeHandlers.has(element)) return;

    log(`Edit field detected in message bubble`);

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
      log('Edit field handler cleaned up');
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