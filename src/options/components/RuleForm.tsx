import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import type { Rule, RuleType } from '../../types';

interface RuleFormProps {
  onSubmit: (ruleData: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const RuleForm: React.FC<RuleFormProps> = ({ onSubmit }) => {
  const [original, setOriginal] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [type, setType] = useState<RuleType>('exact');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [errors, setErrors] = useState<{ original?: string; placeholder?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: { original?: string; placeholder?: string } = {};

    if (!original.trim()) {
      newErrors.original = 'Original text is required';
    }

    if (!placeholder.trim()) {
      newErrors.placeholder = 'Placeholder is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit the rule
    onSubmit({
      original: original.trim(),
      placeholder: placeholder.trim(),
      type,
      enabled: true,
      caseSensitive,
    });

    // Reset form
    setOriginal('');
    setPlaceholder('');
    setType('exact');
    setCaseSensitive(false);
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="card mb-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Add New Rule
      </h2>

      <div className="space-y-4">
        <Input
          label="Original Text"
          placeholder="e.g., John Doe"
          value={original}
          onChange={(e) => setOriginal(e.target.value)}
          error={errors.original}
        />

        <Input
          label="Placeholder"
          placeholder="e.g., [NAME]"
          value={placeholder}
          onChange={(e) => setPlaceholder(e.target.value)}
          error={errors.placeholder}
        />

        <Select
          label="Rule Type"
          value={type}
          onChange={(e) => setType(e.target.value as RuleType)}
          options={[
            { value: 'exact', label: 'Exact Match' },
            { value: 'pattern', label: 'Pattern (Phase 3)' },
            { value: 'regex', label: 'Regex (Phase 3)' },
          ]}
        />

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
            className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Case sensitive
          </span>
        </label>

        <Button type="submit" variant="primary">
          Add Rule
        </Button>
      </div>
    </form>
  );
};
