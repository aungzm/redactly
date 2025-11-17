import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
          {label}
        </label>
      )}
      <input
        className={`input-field ${error ? 'border-gray-700 dark:border-gray-600' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-gray-700 dark:text-gray-400">{error}</p>
      )}
    </div>
  );
};
