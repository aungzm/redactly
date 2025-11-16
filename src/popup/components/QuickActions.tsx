import React from 'react';
import { Button } from '../../components/Button';

export const QuickActions: React.FC = () => {
  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <div className="space-y-2">
      <Button onClick={openOptions} className="w-full" variant="primary">
        Manage Rules
      </Button>
    </div>
  );
};
