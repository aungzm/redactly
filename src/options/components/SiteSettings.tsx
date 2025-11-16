import React from 'react';
import { Toggle } from '../../components/Toggle';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import type { SupportedSite } from '../../types';

export const SiteSettings: React.FC = () => {
  const { siteSettings, toggleSite, loading } = useSiteSettings();

  const sites: Array<{ id: SupportedSite; name: string; description: string; enabled: boolean }> = [
    {
      id: 'chatgpt.com',
      name: 'ChatGPT',
      description: 'Enable redaction on chatgpt.com',
      enabled: true,
    },
    {
      id: 'claude.ai',
      name: 'Claude',
      description: 'Enable redaction on claude.ai',
      enabled: true,
    },
    {
      id: 'chat.deepseek.com',
      name: 'DeepSeek',
      description: 'Enable redaction on chat.deepseek.com',
      enabled: true,
    },
  ];

  if (loading) {
    return <div className="card">Loading...</div>;
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Site Settings
      </h2>

      <div className="space-y-4">
        {sites.map((site) => (
          <div key={site.id} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {site.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {site.description}
              </p>
            </div>
            <Toggle
              checked={siteSettings[site.id]?.enabled ?? false}
              onChange={() => toggleSite(site.id)}
              disabled={!site.enabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
