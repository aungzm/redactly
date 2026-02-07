import { createContentScript } from './shared/content-script-setup';

createContentScript({
  siteName: 'claude.ai',
  selectors: {
    input: '[data-testid="chat-input"]',
    submitButton: 'button[aria-label="Send message"]',
    responseContainer: 'main',
  },
  inputType: 'contenteditable',
  editModeConfig: {
    messageSelector: 'body',
    editFieldSelector: 'textarea[data-1p-ignore="true"]',
    saveButtonSelector: undefined,
    cancelButtonSelector: undefined,
  },
});
