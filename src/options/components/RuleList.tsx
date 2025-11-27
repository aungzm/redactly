import React, { useState } from 'react';
import { RuleItem } from './RuleItem';
import type { Rule } from '../../types';

interface RuleListProps {
  rules: Rule[];
  onUpdate: (id: string, updates: Partial<Rule>) => void;
  onDelete: (id: string) => void;
  onReorder: (reorderedRules: Rule[]) => void;
}

export const RuleList: React.FC<RuleListProps> = ({ rules, onUpdate, onDelete, onReorder }) => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, ruleId: string) => {
    setDraggedItem(ruleId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (ruleId: string) => {
    setDragOverItem(ruleId);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetRuleId: string) => {
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

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Your Rules ({rules.length})
      </h2>

      {/* Exact Match Rules */}
      {exactRules.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 px-1">
            Exact Match ({exactRules.length})
          </h3>
          <div className="space-y-3">
            {exactRules.map((rule) => (
              <div
                key={rule.id}
                draggable
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
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regex Rules */}
      {regexRules.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 px-1">
            Regex ({regexRules.length})
          </h3>
          <div className="space-y-3">
            {regexRules.map((rule) => (
              <div
                key={rule.id}
                draggable
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
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
