import React from 'react';
import clsx from 'clsx';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea: React.FC<TextareaProps> = ({ className, error, ...props }) => {
  return (
    <textarea
      className={clsx(
        'w-full px-3 py-2 border rounded text-sm',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
        'disabled:bg-gray-50 disabled:cursor-not-allowed',
        'resize-y',
        {
          'border-gray-300': !error,
          'border-red-500': error,
        },
        className
      )}
      {...props}
    />
  );
};

export default Textarea;
