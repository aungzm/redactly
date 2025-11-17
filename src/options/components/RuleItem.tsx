import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { Toggle } from '../../components/Toggle';
import { Modal } from '../../components/Modal';
import type { Rule } from '../../types';

interface RuleItemProps {
  rule: Rule;
  onUpdate: (id: string, updates: Partial<Rule>) => void;
  onDelete: (id: string) => void;
}

export const RuleItem: React.FC<RuleItemProps> = ({ rule, onUpdate, onDelete }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleToggle = () => {
    onUpdate(rule.id, { enabled: !rule.enabled });
  };

  const handleDelete = () => {
    onDelete(rule.id);
    setShowDeleteModal(false);
  };

  return (
    <>
      <div className="card flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-gray-900 dark:text-white">
              {rule.original}
            </span>
            <span className="text-gray-400 dark:text-gray-600">→</span>
            <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
              {rule.placeholder}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300">
              {rule.type}
            </span>
            {rule.caseSensitive && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300">
                case-sensitive
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Toggle checked={rule.enabled} onChange={handleToggle} />
          <Button
            variant="danger"
            onClick={() => setShowDeleteModal(true)}
            className="!px-3 !py-1 text-sm"
          >
            Delete
          </Button>
        </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Rule"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-gray-700 dark:text-gray-300">
          Are you sure you want to delete this rule?
        </p>
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
          <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
            {rule.original} → {rule.placeholder}
          </p>
        </div>
      </Modal>
    </>
  );
};
