import React, { useEffect, useRef } from 'react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  indeterminate?: boolean;
  disabled?: boolean;
  label?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  indeterminate = false,
  disabled = false,
  label,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label className={`flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
      <div className="relative flex items-center justify-center">
        <input
          ref={inputRef}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <div
          className={`w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${
            checked || indeterminate
              ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
          } ${disabled ? 'opacity-50' : 'hover:border-gray-400 dark:hover:border-gray-500'}`}
        >
          {checked && !indeterminate && (
            <svg className="w-3 h-3 text-white dark:text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {indeterminate && (
            <svg className="w-3 h-3 text-white dark:text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
            </svg>
          )}
        </div>
      </div>
      {label && (
        <span className="ml-2 text-gray-900 dark:text-gray-100 text-sm">
          {label}
        </span>
      )}
    </label>
  );
};
