import React from 'react';
import { Button } from '../../components/Button';

interface BulkActionsBarProps {
  selectedCount: number;
  onEnable: () => void;
  onDisable: () => void;
  onChangeType: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onEnable,
  onDisable,
  onChangeType,
  onDelete,
  onClearSelection,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg z-40 animate-slide-up">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {selectedCount} rule{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={onClearSelection}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded transition-colors"
            title="Clear selection"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onEnable} className="!px-3 !py-1.5 text-sm">
            Enable
          </Button>
          <Button variant="secondary" onClick={onDisable} className="!px-3 !py-1.5 text-sm">
            Disable
          </Button>
          <Button variant="secondary" onClick={onChangeType} className="!px-3 !py-1.5 text-sm">
            Change Type
          </Button>
          <Button variant="danger" onClick={onDelete} className="!px-3 !py-1.5 text-sm">
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};
