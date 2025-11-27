import React, { useState } from 'react';
import { RuleList } from './components/RuleList';
import { RuleForm } from './components/RuleForm';
import { RuleTester } from './components/RuleTester';
import { SiteSettings } from './components/SiteSettings';
import { RuleImportExport } from './components/RuleImportExport';
import { ThemeToggle } from '../components/ThemeToggle';
import { useRules } from '../hooks/useRules';
import { useTheme } from '../hooks/useTheme';

type Tab = 'rules' | 'sites' | 'test';

export const Options: React.FC = () => {
  const { rules, addRule, updateRule, deleteRule, reorderRules, loading, importRulesFromJson, importRulesWithConflictResolution } = useRules();
  useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('rules');

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Redactly Options
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your redaction rules and settings
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Tabs */}
        <nav className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-800">
          <button
            className={`pb-2 px-4 transition-colors ${
              activeTab === 'rules'
                ? 'border-b-2 border-gray-900 text-gray-900 dark:border-white dark:text-white font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('rules')}
          >
            Rules
          </button>
          <button
            className={`pb-2 px-4 transition-colors ${
              activeTab === 'sites'
                ? 'border-b-2 border-gray-900 text-gray-900 dark:border-white dark:text-white font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('sites')}
          >
            Sites
          </button>
          <button
            className={`pb-2 px-4 transition-colors ${
              activeTab === 'test'
                ? 'border-b-2 border-gray-900 text-gray-900 dark:border-white dark:text-white font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('test')}
          >
            Test
          </button>
        </nav>

        {/* Tab Content */}
        {activeTab === 'rules' && (
          <>
            <RuleForm onSubmit={addRule} />
            <RuleImportExport
              rules={rules}
              onImport={importRulesFromJson}
              onImportWithConflictResolution={importRulesWithConflictResolution}
            />
            <RuleList rules={rules} onUpdate={updateRule} onDelete={deleteRule} onReorder={reorderRules} />
          </>
        )}

        {activeTab === 'sites' && <SiteSettings />}

        {activeTab === 'test' && <RuleTester rules={rules} />}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Redactly v0.1.0 - Phase 1 MVP
          </p>
        </div>
      </div>
    </div>
  );
};
