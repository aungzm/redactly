import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Select } from '../../components/Select';
import type { Rule, RuleType } from '../../types';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: RuleType) => void;
  selectedRules: Rule[];
  isUpdating: boolean;
}

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedRules,
  isUpdating,
}) => {
  const [selectedType, setSelectedType] = useState<RuleType>('exact');

  const regexRulesCount = selectedRules.filter((r) => r.type === 'regex').length;
  const exactRulesCount = selectedRules.filter((r) => r.type === 'exact').length;

  const handleConfirm = () => {
    onConfirm(selectedType);
  };

  const typeOptions = [
    { value: 'exact', label: 'Exact Match' },
    { value: 'regex', label: 'Regex' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Rule Type"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={isUpdating}>
            {isUpdating ? 'Applying...' : 'Apply'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          Change the type of {selectedRules.length} selected rule{selectedRules.length !== 1 ? 's' : ''} to:
        </p>

        <Select
          label="New Type"
          options={typeOptions}
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as RuleType)}
        />

        <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded p-3">
          <p>Rules will be moved to the end of the selected type group.</p>
          {selectedType === 'exact' && regexRulesCount > 0 && (
            <p className="mt-2 text-amber-600 dark:text-amber-400">
              Note: {regexRulesCount} regex rule{regexRulesCount !== 1 ? 's' : ''} will be converted to exact match.
              Regex patterns may not work as expected when used as exact match.
            </p>
          )}
          {selectedType === 'regex' && exactRulesCount > 0 && (
            <p className="mt-2">
              {exactRulesCount} exact match rule{exactRulesCount !== 1 ? 's' : ''} will be converted to regex.
            </p>
          )}
        </div>

        <div className="max-h-32 overflow-y-auto">
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">Selected rules:</p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {selectedRules.slice(0, 5).map((rule) => (
              <li key={rule.id} className="font-mono text-xs truncate">
                {rule.original} → {rule.placeholder}
              </li>
            ))}
            {selectedRules.length > 5 && (
              <li className="text-xs text-gray-500">...and {selectedRules.length - 5} more</li>
            )}
          </ul>
        </div>
      </div>
    </Modal>
  );
};
