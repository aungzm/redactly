import React from 'react';
import { SiteToggle } from './components/SiteToggle';
import { RulesCounter } from './components/RulesCounter';
import { QuickActions } from './components/QuickActions';
import { useStorage } from '../hooks/useStorage';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useTheme } from '../hooks/useTheme';

export const Popup: React.FC = () => {
  useTheme(); // Apply theme to popup
  const { rules, loading: rulesLoading } = useStorage();
  const { currentSite, isEnabled, toggleSite, loading: siteLoading } = useSiteSettings();

  const loading = rulesLoading || siteLoading;

  const enabledRulesCount = rules.filter((rule) => rule.enabled).length;

  if (loading) {
    return (
      <div className="w-80 p-4 bg-white dark:bg-gray-800">
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 p-4 bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Redactly
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Privacy-focused redaction for AI chats
        </p>
      </div>

      {/* Site Toggle */}
      <SiteToggle site={currentSite} enabled={isEnabled} onToggle={toggleSite} />

      {/* Rules Counter */}
      <RulesCounter count={rules.length} enabledCount={enabledRulesCount} />

      {/* Quick Actions */}
      <QuickActions />

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          v0.1.0
        </p>
      </div>
    </div>
  );
};
