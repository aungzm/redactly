import React from 'react';

interface RulesCounterProps {
  count: number;
  enabledCount: number;
}

export const RulesCounter: React.FC<RulesCounterProps> = ({ count, enabledCount }) => {
  return (
    <div className="card mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Active Rules
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {enabledCount} of {count} rules enabled
          </p>
        </div>
        <div className="text-2xl font-bold text-blue-500">
          {enabledCount}
        </div>
      </div>
    </div>
  );
};
