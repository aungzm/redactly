import { createContentScript } from './shared/content-script-setup';

createContentScript({
  siteName: 'chatgpt.com',
  selectors: {
    input: '#prompt-textarea',
    submitButton: 'button[data-testid="send-button"]',
    responseContainer: 'main',
  },
  inputType: 'auto',
  editModeConfig: {
    messageSelector: '.group\\/turn-messages',
    editFieldSelector: 'textarea.resize-none',
    saveButtonSelector: 'button.btn-primary',
    cancelButtonSelector: 'button.btn-secondary',
  },
});
