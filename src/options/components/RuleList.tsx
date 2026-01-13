import React, { useState, useEffect } from 'react';
import { RuleItem } from './RuleItem';
import { BulkActionsBar } from './BulkActionsBar';
import { BulkEditModal } from './BulkEditModal';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Checkbox } from '../../components/Checkbox';
import type { Rule, RuleType } from '../../types';

interface RuleListProps {
  rules: Rule[];
  onUpdate: (id: string, updates: Partial<Rule>) => void;
  onDelete: (id: string) => void;
  onReorder: (reorderedRules: Rule[]) => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onBulkToggle: (ids: string[], enabled: boolean) => Promise<void>;
  onBulkUpdateType: (ids: string[], type: RuleType) => Promise<void>;
}

export const RuleList: React.FC<RuleListProps> = ({
  rules,
  onUpdate,
  onDelete,
  onReorder,
  onBulkDelete,
  onBulkToggle,
  onBulkUpdateType,
}) => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Exit select mode with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelectMode) {
        setIsSelectMode(false);
        setSelectedIds(new Set());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectMode]);

  // Clear selection when exiting select mode
  useEffect(() => {
    if (!isSelectMode) {
      setSelectedIds(new Set());
    }
  }, [isSelectMode]);

  if (rules.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">
          No rules yet. Add your first rule above!
        </p>
      </div>
    );
  }

  // Group rules by type and sort by priority
  const exactRules = rules
    .filter((r) => r.type === 'exact')
    .sort((a, b) => a.priority - b.priority);
  const regexRules = rules
    .filter((r) => r.type === 'regex')
    .sort((a, b) => a.priority - b.priority);

  const selectedRules = rules.filter((r) => selectedIds.has(r.id));

  // Selection helpers
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllOfType = (type: 'exact' | 'regex') => {
    const typeRules = type === 'exact' ? exactRules : regexRules;
    const typeIds = typeRules.map((r) => r.id);
    const allSelected = typeIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        typeIds.forEach((id) => next.delete(id));
      } else {
        typeIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  // Bulk action handlers
  const handleBulkEnable = async () => {
    setIsProcessing(true);
    try {
      await onBulkToggle(Array.from(selectedIds), true);
      clearSelection();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDisable = async () => {
    setIsProcessing(true);
    try {
      await onBulkToggle(Array.from(selectedIds), false);
      clearSelection();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsProcessing(true);
    try {
      await onBulkDelete(Array.from(selectedIds));
      setShowDeleteModal(false);
      clearSelection();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkUpdateType = async (type: RuleType) => {
    setIsProcessing(true);
    try {
      await onBulkUpdateType(Array.from(selectedIds), type);
      setShowEditModal(false);
      clearSelection();
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, ruleId: string) => {
    if (isSelectMode) return;
    setDraggedItem(ruleId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (isSelectMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (ruleId: string) => {
    if (isSelectMode) return;
    setDragOverItem(ruleId);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetRuleId: string) => {
    if (isSelectMode) return;
    e.preventDefault();
    setDragOverItem(null);

    if (!draggedItem || draggedItem === targetRuleId) {
      setDraggedItem(null);
      return;
    }

    const draggedRule = rules.find((r) => r.id === draggedItem);
    const targetRule = rules.find((r) => r.id === targetRuleId);

    if (!draggedRule || !targetRule) {
      setDraggedItem(null);
      return;
    }

    // Only allow reordering within the same type
    if (draggedRule.type !== targetRule.type) {
      setDraggedItem(null);
      return;
    }

    // Get rules of the same type
    const sameTypeRules = rules.filter((r) => r.type === draggedRule.type);
    const draggedIndex = sameTypeRules.findIndex((r) => r.id === draggedItem);
    const targetIndex = sameTypeRules.findIndex((r) => r.id === targetRuleId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }

    // Reorder within the same type
    const reordered = [...sameTypeRules];
    const [movedRule] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, movedRule);

    // Update priorities for reordered rules
    const updatedReordered = reordered.map((rule, index) => ({
      ...rule,
      priority: index,
    }));

    // Combine with other type rules
    const otherTypeRules = rules.filter((r) => r.type !== draggedRule.type);
    const finalRules = draggedRule.type === 'exact'
      ? [...updatedReordered, ...otherTypeRules]
      : [...otherTypeRules, ...updatedReordered];

    onReorder(finalRules);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const allExactSelected = exactRules.length > 0 && exactRules.every((r) => selectedIds.has(r.id));
  const allRegexSelected = regexRules.length > 0 && regexRules.every((r) => selectedIds.has(r.id));
  const someExactSelected = exactRules.some((r) => selectedIds.has(r.id));
  const someRegexSelected = regexRules.some((r) => selectedIds.has(r.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Your Rules ({rules.length})
        </h2>
        <Button
          variant="secondary"
          onClick={() => setIsSelectMode(!isSelectMode)}
          className="!px-3 !py-1.5 text-sm"
        >
          {isSelectMode ? 'Cancel' : 'Select'}
        </Button>
      </div>

      {/* Exact Match Rules */}
      {exactRules.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              {isSelectMode && (
                <Checkbox
                  checked={allExactSelected}
                  indeterminate={someExactSelected && !allExactSelected}
                  onChange={() => selectAllOfType('exact')}
                />
              )}
              Exact Match ({exactRules.length})
            </h3>
          </div>
          <div className="space-y-3">
            {exactRules.map((rule) => (
              <div
                key={rule.id}
                draggable={!isSelectMode}
                onDragStart={(e) => handleDragStart(e, rule.id)}
                onDragOver={handleDragOver}
                onDragEnter={() => handleDragEnter(rule.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, rule.id)}
                onDragEnd={handleDragEnd}
                className={`transition-all ${
                  draggedItem === rule.id
                    ? 'opacity-50'
                    : dragOverItem === rule.id
                      ? 'ring-2 ring-blue-500 rounded-lg'
                      : ''
                }`}
              >
                <RuleItem
                  rule={rule}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  isDragging={draggedItem === rule.id}
                  isSelectMode={isSelectMode}
                  isSelected={selectedIds.has(rule.id)}
                  onToggleSelect={toggleSelection}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regex Rules */}
      {regexRules.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              {isSelectMode && (
                <Checkbox
                  checked={allRegexSelected}
                  indeterminate={someRegexSelected && !allRegexSelected}
                  onChange={() => selectAllOfType('regex')}
                />
              )}
              Regex ({regexRules.length})
            </h3>
          </div>
          <div className="space-y-3">
            {regexRules.map((rule) => (
              <div
                key={rule.id}
                draggable={!isSelectMode}
                onDragStart={(e) => handleDragStart(e, rule.id)}
                onDragOver={handleDragOver}
                onDragEnter={() => handleDragEnter(rule.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, rule.id)}
                onDragEnd={handleDragEnd}
                className={`transition-all ${
                  draggedItem === rule.id
                    ? 'opacity-50'
                    : dragOverItem === rule.id
                      ? 'ring-2 ring-blue-500 rounded-lg'
                      : ''
                }`}
              >
                <RuleItem
                  rule={rule}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  isDragging={draggedItem === rule.id}
                  isSelectMode={isSelectMode}
                  isSelected={selectedIds.has(rule.id)}
                  onToggleSelect={toggleSelection}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add padding at bottom when bulk actions bar is visible */}
      {selectedIds.size > 0 && <div className="h-16" />}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onEnable={handleBulkEnable}
        onDisable={handleBulkDisable}
        onChangeType={() => setShowEditModal(true)}
        onDelete={() => setShowDeleteModal(true)}
        onClearSelection={clearSelection}
      />

      {/* Bulk Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Rules"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBulkDelete} disabled={isProcessing}>
              {isProcessing ? 'Deleting...' : `Delete ${selectedIds.size} Rule${selectedIds.size !== 1 ? 's' : ''}`}
            </Button>
          </>
        }
      >
        <p className="text-gray-700 dark:text-gray-300">
          Are you sure you want to delete {selectedIds.size} rule{selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.
        </p>
        <div className="mt-4 max-h-32 overflow-y-auto">
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {selectedRules.slice(0, 5).map((rule) => (
              <li key={rule.id} className="font-mono text-xs truncate p-2 bg-gray-100 dark:bg-gray-800 rounded">
                {rule.original} → {rule.placeholder}
              </li>
            ))}
            {selectedRules.length > 5 && (
              <li className="text-xs text-gray-500 p-2">...and {selectedRules.length - 5} more</li>
            )}
          </ul>
        </div>
      </Modal>

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onConfirm={handleBulkUpdateType}
        selectedRules={selectedRules}
        isUpdating={isProcessing}
      />
    </div>
  );
};
