import { createContentScript } from './shared/content-script-setup';

createContentScript({
  siteName: 'gemini.google.com',
  selectors: {
    input: '.ql-editor.textarea.new-input-ui',
    submitButton: 'button[aria-label="Send message"], button[data-tooltip="Send message"]',
    responseContainer: 'main',
  },
  inputType: 'contenteditable',
  editModeConfig: {
    messageSelector: 'body',
    editFieldSelector: 'textarea[aria-label="Edit prompt"]',
    saveButtonSelector: 'button[aria-label="Update message"]',
    cancelButtonSelector: 'button[aria-label="Cancel"]',
  },
});
