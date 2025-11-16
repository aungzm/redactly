import React from 'react';
import { Toggle } from '../../components/Toggle';
import type { SupportedSite } from '../../types';

interface SiteToggleProps {
  site: SupportedSite | null;
  enabled: boolean;
  onToggle: (site: SupportedSite) => void;
}

export const SiteToggle: React.FC<SiteToggleProps> = ({ site, enabled, onToggle }) => {
  if (!site) {
    return (
      <div className="card mb-4">
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          This site is not supported by Redactly.
        </p>
        <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
          Supported: ChatGPT, Claude, DeepSeek
        </p>
      </div>
    );
  }

  const siteNames: Record<SupportedSite, string> = {
    'chatgpt.com': 'ChatGPT',
    'claude.ai': 'Claude',
    'chat.deepseek.com': 'DeepSeek',
  };

  return (
    <div className="card mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {siteNames[site]}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {enabled ? 'Redaction active' : 'Redaction disabled'}
          </p>
        </div>
        <Toggle checked={enabled} onChange={() => onToggle(site)} />
      </div>
    </div>
  );
};
