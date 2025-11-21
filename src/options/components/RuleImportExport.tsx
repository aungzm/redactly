import React, { useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { exportRules } from '../../content-scripts/shared/ruleImportExport';
import type { Rule } from '../../types';
import type { ImportResult } from '../../content-scripts/shared/ruleImportExport';

interface RuleImportExportProps {
  rules: Rule[];
  onImport: (jsonContent: string) => Promise<ImportResult>;
}

export const RuleImportExport: React.FC<RuleImportExportProps> = ({
  rules,
  onImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const handleExport = () => {
    const jsonContent = exportRules(rules);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `redactly-rules-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const content = await file.text();
      const result = await onImport(content);
      setImportResult(result);
      setShowResultModal(true);
    } catch (error) {
      setImportResult({
        success: false,
        message: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      setShowResultModal(true);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Import / Export Rules
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Backup your rules or share them with others
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleExport}
              disabled={rules.length === 0}
              variant="secondary"
            >
              📥 Export Rules
            </Button>
            <Button
              onClick={handleImportClick}
              disabled={isImporting}
              variant="secondary"
            >
              {isImporting ? 'Importing...' : '📤 Import Rules'}
            </Button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isImporting}
      />

      {showResultModal && importResult && (
        <Modal
          isOpen={showResultModal}
          onClose={() => setShowResultModal(false)}
          title={importResult.success ? '✓ Import Successful' : '✗ Import Failed'}
        >
          <div className="space-y-4">
            <p
              className={`text-sm ${
                importResult.success
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              {importResult.message}
            </p>

            {importResult.duplicates && importResult.duplicates.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                <p className="text-sm font-medium text-red-900 dark:text-red-200 mb-2">
                  Duplicate Rules Found:
                </p>
                <ul className="text-sm text-red-800 dark:text-red-300 space-y-1">
                  {importResult.duplicates.map((dup) => (
                    <li key={dup}>• "{dup}"</li>
                  ))}
                </ul>
              </div>
            )}

            {importResult.importedCount !== undefined && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
                <p className="text-sm text-green-900 dark:text-green-200">
                  {importResult.importedCount} rule(s) imported successfully
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                onClick={() => setShowResultModal(false)}
                variant="primary"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
