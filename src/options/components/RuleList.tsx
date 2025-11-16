import React from 'react';
import { RuleItem } from './RuleItem';
import type { Rule } from '../../types';

interface RuleListProps {
  rules: Rule[];
  onUpdate: (id: string, updates: Partial<Rule>) => void;
  onDelete: (id: string) => void;
}

export const RuleList: React.FC<RuleListProps> = ({ rules, onUpdate, onDelete }) => {
  if (rules.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">
          No rules yet. Add your first rule above!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Your Rules ({rules.length})
      </h2>
      {rules.map((rule) => (
        <RuleItem
          key={rule.id}
          rule={rule}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
