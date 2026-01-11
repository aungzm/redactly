import React, { useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import {
  createBackup,
  restoreBackup,
  getBackupInfo,
  type RestoreOptions,
  type RestoreResult,
} from '../../lib/backupRestore';

export const BackupRestore: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [pendingFileContent, setPendingFileContent] = useState<string | null>(null);
  const [backupInfo, setBackupInfo] = useState<{
    exportedAt: string;
    appVersion: string;
    rulesCount: number;
    sitesCount: number;
    hasSettings: boolean;
  } | null>(null);
  const [restoreOptions, setRestoreOptions] = useState<RestoreOptions>({
    restoreRules: true,
    restoreSiteSettings: true,
    restoreSettings: true,
  });
  const [result, setResult] = useState<RestoreResult | null>(null);

  const handleBackup = async () => {
    setIsProcessing(true);
    try {
      const backupContent = await createBackup();
      const blob = new Blob([backupContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `redactly-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const content = await file.text();
      const info = getBackupInfo(content);

      if (!info.valid || !info.info) {
        setResult({
          success: false,
          message: info.error || 'Invalid backup file',
        });
        setShowResultModal(true);
        return;
      }

      // Show preview modal with backup contents
      setBackupInfo(info.info);
      setPendingFileContent(content);
      setRestoreOptions({
        restoreRules: true,
        restoreSiteSettings: true,
        restoreSettings: true,
      });
      setShowPreviewModal(true);
    } catch (error) {
      setResult({
        success: false,
        message: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      setShowResultModal(true);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingFileContent) return;

    setIsProcessing(true);
    try {
      const restoreResult = await restoreBackup(pendingFileContent, restoreOptions);
      setResult(restoreResult);
      setShowPreviewModal(false);
      setShowResultModal(true);
    } catch (error) {
      setResult({
        success: false,
        message: `Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      setShowResultModal(true);
    } finally {
      setIsProcessing(false);
      setPendingFileContent(null);
      setBackupInfo(null);
    }
  };

  const handleCancelRestore = () => {
    setShowPreviewModal(false);
    setPendingFileContent(null);
    setBackupInfo(null);
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString();
    } catch {
      return isoString;
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Backup Section */}
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create Backup
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Export all your rules, site settings, and preferences to a file
              </p>
            </div>
            <Button onClick={handleBackup} disabled={isProcessing} variant="primary">
              {isProcessing ? 'Creating...' : 'Create Backup'}
            </Button>
          </div>
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your backup will include:
            </p>
            <ul className="mt-2 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
              <li>All redaction rules (exact and regex)</li>
              <li>Site-specific settings (enabled/disabled status)</li>
              <li>Application preferences</li>
            </ul>
          </div>
        </div>

        {/* Restore Section */}
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Restore from Backup
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Import a previously exported backup file
              </p>
            </div>
            <Button onClick={handleRestoreClick} disabled={isProcessing} variant="secondary">
              {isProcessing ? 'Processing...' : 'Restore Backup'}
            </Button>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Warning: Restoring will replace your current data with the backup contents. Consider creating a backup first.
            </p>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isProcessing}
      />

      {/* Preview Modal */}
      {showPreviewModal && backupInfo && (
        <Modal
          isOpen={showPreviewModal}
          onClose={handleCancelRestore}
          title="Restore Backup"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Backup Information
              </h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600 dark:text-gray-400">Created:</dt>
                  <dd className="text-gray-900 dark:text-white">{formatDate(backupInfo.exportedAt)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600 dark:text-gray-400">App Version:</dt>
                  <dd className="text-gray-900 dark:text-white">{backupInfo.appVersion}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Select what to restore:
              </h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750">
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Rules
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      ({backupInfo.rulesCount} rule{backupInfo.rulesCount !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={restoreOptions.restoreRules}
                    onChange={(e) =>
                      setRestoreOptions((prev) => ({ ...prev, restoreRules: e.target.checked }))
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750">
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Site Settings
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      ({backupInfo.sitesCount} site{backupInfo.sitesCount !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={restoreOptions.restoreSiteSettings}
                    onChange={(e) =>
                      setRestoreOptions((prev) => ({ ...prev, restoreSiteSettings: e.target.checked }))
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750">
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      App Settings
                    </span>
                    {backupInfo.hasSettings && (
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        (preferences)
                      </span>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={restoreOptions.restoreSettings}
                    onChange={(e) =>
                      setRestoreOptions((prev) => ({ ...prev, restoreSettings: e.target.checked }))
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    disabled={!backupInfo.hasSettings}
                  />
                </label>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Selected items will replace your current data. This cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={handleCancelRestore} variant="secondary">
                Cancel
              </Button>
              <Button
                onClick={handleConfirmRestore}
                variant="primary"
                disabled={
                  isProcessing ||
                  (!restoreOptions.restoreRules &&
                    !restoreOptions.restoreSiteSettings &&
                    !restoreOptions.restoreSettings)
                }
              >
                {isProcessing ? 'Restoring...' : 'Restore Selected'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Result Modal */}
      {showResultModal && result && (
        <Modal
          isOpen={showResultModal}
          onClose={() => setShowResultModal(false)}
          title={result.success ? 'Restore Successful' : 'Restore Failed'}
        >
          <div className="space-y-4">
            <p
              className={`text-sm ${
                result.success
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              {result.message}
            </p>

            {result.success && result.details && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
                <p className="text-sm font-medium text-green-900 dark:text-green-200 mb-2">
                  Restored:
                </p>
                <ul className="text-sm text-green-800 dark:text-green-300 space-y-1">
                  {result.details.rulesCount > 0 && (
                    <li>
                      {result.details.rulesCount} rule{result.details.rulesCount !== 1 ? 's' : ''}
                    </li>
                  )}
                  {result.details.sitesCount > 0 && (
                    <li>
                      {result.details.sitesCount} site setting{result.details.sitesCount !== 1 ? 's' : ''}
                    </li>
                  )}
                  {result.details.settingsRestored && <li>App settings</li>}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={() => setShowResultModal(false)} variant="primary">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
