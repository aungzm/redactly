import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { redact } from '../../content-scripts/shared/redactor';
import type { Rule } from '../../types';

interface RuleTesterProps {
  rules: Rule[];
}

export const RuleTester: React.FC<RuleTesterProps> = ({ rules }) => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [appliedRulesCount, setAppliedRulesCount] = useState(0);

  const handleTest = () => {
    const result = redact(inputText, rules);
    setOutputText(result.text);
    setAppliedRulesCount(result.appliedRules.length);
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setAppliedRulesCount(0);
  };

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Test Redaction
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            Input Text
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="input-field min-h-[100px] resize-y"
            placeholder="Enter text to test redaction..."
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleTest} variant="primary" disabled={!inputText}>
            Test Redaction
          </Button>
          <Button onClick={handleClear} variant="secondary">
            Clear
          </Button>
        </div>

        {outputText && (
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Output ({appliedRulesCount} rule{appliedRulesCount !== 1 ? 's' : ''} applied)
            </label>
            <div className="input-field min-h-[100px] bg-gray-50 dark:bg-gray-800 whitespace-pre-wrap text-gray-900 dark:text-gray-100">
              {outputText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
