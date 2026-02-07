import type { EditModeConfig } from './edit-mode-monitor';

export interface SiteSelectors {
  input: string;
  submitButton: string;
  responseContainer: string;
}

export interface SiteConfig {
  siteName: string;
  selectors: SiteSelectors;
  inputType: 'contenteditable' | 'textarea' | 'auto';
  editModeConfig: EditModeConfig;
}
