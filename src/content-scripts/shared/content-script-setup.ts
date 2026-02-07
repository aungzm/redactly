import type { Rule } from '../../types';
import { setupClipboard, updateClipboardRules } from './clipboard';
import {
  waitForElement,
  getRulesFromStorage,
  onRulesChanged,
  log,
  logError,
  isSiteEnabled,
  updateSiteLastUsed,
  ListenerManager,
} from './utils';
import { EditModeMonitor } from './edit-mode-monitor';
import { setupContenteditableInterception } from './contenteditable-handler';
import { setupTextareaInterception } from './textarea-handler';
import type { SiteConfig } from './types';

export function createContentScript(config: SiteConfig): void {
  const { siteName, selectors, inputType, editModeConfig } = config;

  let rules: Rule[] = [];
  let isEnabled = false;
  let editModeMonitor: EditModeMonitor | null = null;

  const listenerManager = new ListenerManager();

  let isInitialized = false;
  let inputObserver: MutationObserver | null = null;
  let rulesChangedCleanup: (() => void) | null = null;

  const initializedElements = new WeakSet<HTMLElement>();

  const getRules = () => rules;
  const getIsEnabled = () => isEnabled;

  function setupElement(input: HTMLElement): void {
    if (inputType === 'contenteditable' || (inputType === 'auto' && input.hasAttribute('contenteditable'))) {
      setupContenteditableInterception({
        element: input as HTMLDivElement,
        submitButtonSelector: selectors.submitButton,
        getRules,
        getIsEnabled,
        listenerManager,
      });
    } else if (inputType === 'textarea' || (inputType === 'auto' && input.tagName === 'TEXTAREA')) {
      setupTextareaInterception({
        textarea: input as HTMLTextAreaElement,
        submitButtonSelector: selectors.submitButton,
        getRules,
        getIsEnabled,
        listenerManager,
      });
    } else {
      logError(`Unknown input element type: ${input.tagName}`);
    }
  }

  function cleanup(): void {
    listenerManager.cleanup();

    if (editModeMonitor) {
      editModeMonitor.destroy();
      editModeMonitor = null;
    }

    if (inputObserver) {
      inputObserver.disconnect();
      inputObserver = null;
    }

    if (rulesChangedCleanup) {
      rulesChangedCleanup();
      rulesChangedCleanup = null;
    }
  }

  function observeForNewInputs(): void {
    if (inputObserver) {
      inputObserver.disconnect();
    }

    inputObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          const input = document.querySelector(selectors.input) as HTMLElement;
          if (input && !initializedElements.has(input)) {
            initializedElements.add(input);
            log('New input element detected, setting up interception');
            setupElement(input);
          }
        }
      }
    });

    inputObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  async function setupInputRedaction(): Promise<void> {
    log('Setting up input redaction');

    const inputElement = await waitForElement(selectors.input);

    if (!inputElement) {
      logError('Could not find input element');
      return;
    }

    log(`Input element found: ${inputElement.tagName}`);
    setupElement(inputElement as HTMLElement);
    observeForNewInputs();
  }

  async function init(): Promise<void> {
    if (isInitialized) {
      log('Already initialized, cleaning up before re-init');
      cleanup();
    }

    try {
      log(`Initializing ${siteName} content script`);

      isEnabled = await isSiteEnabled(siteName);
      if (!isEnabled) {
        log('Site is disabled. Skipping initialization.');
        return;
      }

      rules = await getRulesFromStorage();
      log(`Loaded ${rules.length} rules`);

      updateSiteLastUsed(siteName);

      setupClipboard(rules, selectors.responseContainer);

      await setupInputRedaction();

      editModeMonitor = new EditModeMonitor(editModeConfig, rules, isEnabled);
      log('Edit mode monitoring initialized');

      rulesChangedCleanup = onRulesChanged((newRules) => {
        log('Rules updated', newRules);
        rules = newRules;
        updateClipboardRules(newRules);
        editModeMonitor?.updateRules(newRules);
      });

      isInitialized = true;
      log('Initialization complete');
    } catch (error) {
      logError('Failed to initialize', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
