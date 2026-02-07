import { createContentScript } from './shared/content-script-setup';

createContentScript({
  siteName: 'chat.deepseek.com',
  selectors: {
    input: 'textarea[placeholder="Message DeepSeek"]',
    submitButton: 'button[type="submit"]',
    responseContainer: 'main',
  },
  inputType: 'textarea',
  editModeConfig: {
    messageSelector: 'body',
    editFieldSelector: 'textarea[name="user query"]',
    saveButtonSelector: undefined,
    cancelButtonSelector: undefined,
  },
});
